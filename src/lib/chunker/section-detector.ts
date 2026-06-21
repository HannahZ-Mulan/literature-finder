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
 * Detects sections in academic paper text
 * @param fullText - Full extracted text from paper
 * @returns Array of detected sections
 */
export function detectSections(fullText: string): Section[] {
  // Validation
  if (!fullText || fullText.length < 100) {
    throw new Error(`Text too short to chunk: ${fullText?.length || 0} characters`);
  }

  // Section patterns (order matters - most specific first)
  const sectionPatterns = [
    { pattern: /^(abstract)\s*$/i, type: ChunkType.ABSTRACT },
    { pattern: /^(introduction)\s*$/i, type: ChunkType.INTRODUCTION },
    { pattern: /^(literature\s+review|related\s+work|background)\s*$/i, type: ChunkType.LITERATURE_REVIEW },
    { pattern: /^(method|methodology|materials?\s+and\s+methods)\s*$/i, type: ChunkType.METHODS },
    { pattern: /^(results?\s+and\s+discussion|results?|findings)\s*$/i, type: ChunkType.RESULTS },
    { pattern: /^(discussion)\s*$/i, type: ChunkType.DISCUSSION },
    { pattern: /^(conclusion|conclusions|concluding\s+remarks)\s*$/i, type: ChunkType.CONCLUSION },
    { pattern: /^(references?|bibliography)\s*$/i, type: ChunkType.REFERENCES },
    { pattern: /^(appendix)\s*$/i, type: ChunkType.APPENDIX }
  ];

  const sections: Section[] = [];
  const lines = fullText.split('\n');
  let currentPos = 0;
  let lastSection: Section | null = null;

  // Scan through lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if this line matches a section header
    for (const { pattern, type } of sectionPatterns) {
      if (pattern.test(line)) {
        // Save previous section if exists
        if (lastSection) {
          lastSection.endPos = currentPos;
          lastSection.text = fullText.substring(lastSection.startPos, currentPos).trim();
        }

        // Start new section
        lastSection = {
          type,
          startPos: currentPos,
          endPos: 0,
          text: ''
        };
        sections.push(lastSection);
        break;
      }
    }

    // Update position (account for line + newline)
    currentPos += lines[i].length + 1;
  }

  // Handle last section
  if (lastSection) {
    lastSection.endPos = fullText.length;
    lastSection.text = fullText.substring(lastSection.startPos).trim();
  }

  // Validation: Must have at least 2 sections to be valid
  if (sections.length < 2) {
    console.warn(`Only ${sections.length} sections detected, falling back to fixed-size chunks`);
    return createFixedChunks(fullText);
  }

  console.log(`✅ Detected ${sections.length} sections`);
  return sections;
}

/**
 * Fallback: Create fixed-size chunks when section detection fails
 * @param text - Full text
 * @param chunkSize - Size of each chunk in characters
 * @returns Array of fixed-size chunks
 */
function createFixedChunks(text: string, chunkSize = 5000): Section[] {
  const chunks: Section[] = [];
  const numChunks = Math.ceil(text.length / chunkSize);

  for (let i = 0; i < numChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, text.length);

    chunks.push({
      type: ChunkType.UNKNOWN,
      startPos: start,
      endPos: end,
      text: text.substring(start, end).trim()
    });
  }

  console.log(`✅ Created ${numChunks} fixed-size chunks`);
  return chunks;
}
