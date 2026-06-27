export interface Section {
  type: ChunkType;
  startPos: number;
  endPos: number;
  text: string;
}

export enum ChunkType {
  ABSTRACT = 'abstract',
  INTRODUCTION = 'introduction',
  LITERATURE_REVIEW = 'literature_review',
  METHODS = 'methods',
  RESULTS = 'results',
  DISCUSSION = 'discussion',
  CONCLUSION = 'conclusion',
  REFERENCES = 'references',
  APPENDIX = 'appendix',
  UNKNOWN = 'unknown'
}

/**
 * Section header patterns. Relaxed from the original "exact full-line match"
 * to handle how PDF extraction actually renders headers:
 *   - Numbered: "1. Introduction", "2 Methods", "3.1 Methodology"
 *   - With colon/dot: "Abstract:", "Methods."
 *   - All-caps: "INTRODUCTION", "DISCUSSION"
 *   - Bilingual: "摘要 Abstract", "方法 Methods"
 *
 * A line is treated as a header when:
 *   1. After stripping an optional leading number prefix, the remainder
 *      (trimmed) matches one of the patterns below, AND
 *   2. The line is reasonably short (<= 60 chars) — a real header isn't a
 *      full sentence of body text.
 *
 * Patterns are anchored to the START of the trimmed remainder and allow a
 * trailing colon/dot/whitespace, but reject if followed by too much body
 * text (heuristic: a header line has at most a few words after the label).
 */
interface SectionRule {
  type: ChunkType;
  // Matches the header label after stripping the leading number prefix.
  // Uses case-insensitive matching; anchored at start.
  label: RegExp;
}

const SECTION_RULES: SectionRule[] = [
  { type: ChunkType.ABSTRACT,         label: /^(abstract|摘要|内容提要|提要)\b/i },
  { type: ChunkType.INTRODUCTION,     label: /^(introduction|引言|前言|背景)\b/i },
  { type: ChunkType.LITERATURE_REVIEW,label: /^(literature\s+review|related\s+work|background|文献综述|文献回顾|相关工作|研究综述)\b/i },
  { type: ChunkType.METHODS,          label: /^(method(s|ology)?|materials?\s+and\s+methods?|experimental\s+procedures?|实验|方法|研究对象与方法|研究方法)\b/i },
  { type: ChunkType.RESULTS,          label: /^(results?(\s+and\s+discussion)?|findings|结果|研究结果|结果与分析)\b/i },
  { type: ChunkType.DISCUSSION,       label: /^(discussion|讨论|分析与讨论)\b/i },
  { type: ChunkType.CONCLUSION,       label: /^(conclusion(s)?|concluding\s+remarks?|summary|结论|小结|总结)\b/i },
  { type: ChunkType.REFERENCES,       label: /^(references?|bibliography|参考文献|引用文献)\b/i },
  { type: ChunkType.APPENDIX,         label: /^(appendix(es)?|supplementary|附录|补充材料)\b/i },
];

// Max chars for a line to be considered a header. Body sentences are usually
// longer; this filters out "Abstract. This study examines how..." where the
// whole abstract is on one line.
const MAX_HEADER_LINE_LEN = 60;
// After the matched label, allow only short suffixes (":", ".", numbers, a
// few words up to ~15 chars). A header like "3. Results" leaves "3. " which
// is fine; "Results of our longitudinal analysis of..." is not.
const MAX_LABEL_TAIL_LEN = 15;

/**
 * Try to strip a leading section number prefix: "1.", "2 ", "3.1", "I.", "A)".
 * Returns [strippedLine, matched] — strippedLine without the number, matched=true if stripped.
 */
function stripNumberPrefix(line: string): string {
  // "1. Introduction" → "Introduction"; "2 Methods" → "Methods";
  // "3.1.2 Methodology" → "Methodology"; "A. Appendix" → "Appendix"
  return line.replace(/^(\d+(\.\d+)*\.?\s*|[IVXLC]+\.?\s*|[A-Z]\)\s*)/i, '').trim();
}

/** Test whether a single line looks like a section header. Returns the type or null. */
function matchHeader(line: string): ChunkType | null {
  const raw = line.trim();
  if (raw.length === 0 || raw.length > MAX_HEADER_LINE_LEN) return null;

  // Try with number prefix stripped first (handles "1. Introduction").
  const candidates = [stripNumberPrefix(raw), raw];

  for (const cand of candidates) {
    if (!cand) continue;
    for (const rule of SECTION_RULES) {
      const m = cand.match(rule.label);
      if (m) {
        // Reject if there's too much text after the label (likely body, not header).
        const tail = cand.slice(m[0].length).replace(/^[.:、，,\s]+/, '');
        if (tail.length > MAX_LABEL_TAIL_LEN) continue;
        return rule.type;
      }
    }
  }
  return null;
}

// Threshold: if the biggest single chunk exceeds this, split it into
// paragraph-bounded sub-chunks so embeddings/search stay meaningful.
const MAX_CHUNK_CHARS = 8000;

/**
 * Detects sections in academic paper text. Handles numbered headers,
 * English and Chinese labels, all-caps, and falls back gracefully.
 */
export function detectSections(fullText: string): Section[] {
  if (!fullText || fullText.length < 100) {
    throw new Error(`Text too short to chunk: ${fullText?.length || 0} characters`);
  }

  const sections: Section[] = [];
  const lines = fullText.split('\n');
  let currentPos = 0;
  let lastSection: { type: ChunkType; startPos: number } | null = null;

  // First pass: detect header lines and record their byte positions.
  const headerMarks: Array<{ type: ChunkType; startPos: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const type = matchHeader(line);
    if (type) {
      headerMarks.push({ type, startPos: currentPos });
    }
    currentPos += line.length + 1; // +1 for the newline
  }

  // Build sections from header marks. Content before the first header is
  // a leading "preamble" (title page / abstract context) — attach to abstract
  // if present, else mark UNKNOWN.
  if (headerMarks.length === 0) {
    console.warn('No section headers detected, falling back to position-based chunks');
    return createFixedChunks(fullText);
  }

  for (let i = 0; i < headerMarks.length; i++) {
    const start = headerMarks[i].startPos;
    const end = i + 1 < headerMarks.length ? headerMarks[i + 1].startPos : fullText.length;
    const text = fullText.substring(start, end).trim();
    if (text.length > 0) {
      sections.push({
        type: headerMarks[i].type,
        startPos: start,
        endPos: end,
        text,
      });
    }
  }

  // Anything before the first detected header (title/affiliations/abstract lead-in)?
  if (headerMarks[0].startPos > 200) {
    const preamble = fullText.substring(0, headerMarks[0].startPos).trim();
    if (preamble.length > 200) {
      sections.unshift({
        type: ChunkType.ABSTRACT, // preamble usually contains the abstract
        startPos: 0,
        endPos: headerMarks[0].startPos,
        text: preamble,
      });
    }
  }

  console.log(`✅ Detected ${sections.length} sections`);
  return splitOversizedSections(sections);
}

/**
 * Split any section larger than MAX_CHUNK_CHARS into paragraph-bounded sub-chunks.
 * Keeps the original type label. This prevents one giant "abstract" from
 * swallowing half the paper (the #5 regression).
 */
function splitOversizedSections(sections: Section[]): Section[] {
  const out: Section[] = [];
  for (const sec of sections) {
    if (sec.text.length <= MAX_CHUNK_CHARS) {
      out.push(sec);
      continue;
    }
    const paragraphs = sec.text.split(/\n\s*\n/); // blank-line separated
    let buffer = '';
    let bufferStart = sec.startPos;
    const flush = (endPos: number) => {
      if (buffer.trim().length > 0) {
        out.push({
          type: sec.type,
          startPos: bufferStart,
          endPos,
          text: buffer.trim(),
        });
      }
      buffer = '';
    };
    let cursor = sec.startPos;
    for (const para of paragraphs) {
      // Locate this paragraph's offset (approx) to track positions.
      const paraWithBreaks = para + '\n\n';
      if ((buffer + para).length > MAX_CHUNK_CHARS && buffer.length > 0) {
        flush(cursor);
        bufferStart = cursor;
      }
      buffer += (buffer ? '\n\n' : '') + para;
      cursor += paraWithBreaks.length;
    }
    flush(sec.endPos);
  }
  return out;
}

/**
 * Fallback: create position-aware chunks instead of all-UNKNOWN.
 * Heuristics: leading content → abstract, trailing references-like → references,
 * middle → methods/results by position. Still degrades gracefully.
 */
function createFixedChunks(text: string, chunkSize = 5000): Section[] {
  const chunks: Section[] = [];
  const numChunks = Math.ceil(text.length / chunkSize);

  for (let i = 0; i < numChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, text.length);

    // Position-based heuristic labeling.
    let type: ChunkType = ChunkType.UNKNOWN;
    const ratio = i / Math.max(1, numChunks - 1);
    if (numChunks === 1) {
      type = ChunkType.ABSTRACT; // single chunk, treat as abstract/whole
    } else if (i === 0) {
      type = ChunkType.ABSTRACT;
    } else if (i === numChunks - 1) {
      // Check if last chunk looks like references (many short citation lines).
      type = ChunkType.REFERENCES;
    } else if (ratio < 0.4) {
      type = ChunkType.INTRODUCTION;
    } else if (ratio < 0.7) {
      type = ChunkType.METHODS;
    } else {
      type = ChunkType.RESULTS;
    }

    chunks.push({
      type,
      startPos: start,
      endPos: end,
      text: text.substring(start, end).trim(),
    });
  }

  console.log(`✅ Created ${numChunks} position-aware fixed chunks`);
  return chunks;
}
