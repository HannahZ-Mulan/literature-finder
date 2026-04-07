/**
 * Academic-focused AI Prompts
 * Prompts designed to generate specific, content-based summaries
 */

export interface PaperContent {
  title: string;
  abstract: string;
  introduction?: string;
  conclusion?: string;
}

export interface StructuredAnalysis {
  research_question: string;
  methodology: string;
  key_results: string;
  contributions: string;
  limitations?: string;
}

/**
 * Step 1: Extract structured information from paper
 */
export function getExtractionPrompt(content: PaperContent): string {
  return `You are an expert academic analyst with deep expertise in research methodology and critical analysis. Your task is to extract and analyze the following information from this paper with maximum precision and depth.

TITLE: ${content.title}

${content.introduction ? `INTRODUCTION (excerpt):\n${content.introduction.substring(0, 1500)}\n\n` : ''}ABSTRACT:
${content.abstract}

${content.conclusion ? `CONCLUSION (excerpt):\n${content.conclusion.substring(0, 1000)}\n\n` : ''}Extract and provide ONLY the following information in JSON format:

{
  "research_question": "What SPECIFIC problem does this paper solve? Include: (1) The exact domain/field, (2) The precise gap or limitation in existing work being addressed, (3) The core challenge being tackled. Example: 'In computer vision domain, addresses the limitation that existing CNNs fail to capture long-range dependencies when processing high-resolution medical images, leading to suboptimal segmentation accuracy.'",
  "methodology": "What SPECIFIC approach, algorithm, framework, or method is proposed? Include: (1) The exact name of the method/algorithm, (2) Key technical components or modules, (3) Theoretical foundations, (4) Implementation details. Example: 'Proposes Vision Transformer (ViT) architecture with patch embedding, multi-head self-attention layers, and MLP blocks, trained using Adam optimizer with cosine learning rate decay.'",
  "key_results": "What are the QUANTITATIVE findings? Include: (1) Exact performance metrics with numbers, (2) Comparison to baselines or state-of-the-art, (3) Statistical significance if mentioned, (4) Results on specific datasets/benchmarks. Example: 'Achieved 94.2% accuracy on ImageNet (vs 88.5% ResNet-50 baseline), 3.8% improvement in F1 score on COCO dataset, p<0.01 statistical significance.'",
  "contributions": "What is NOVEL and SPECIFIC to this work? Include: (1) Theoretical innovations, (2) Practical advancements, (3) How it differs from or improves upon existing methods, (4) New datasets/benchmarks if introduced, (5) Insights that advance the field. Example: 'First to apply transformer architecture to vision tasks at scale, demonstrating that scale matters more than inductive biases; showed pre-training on large datasets generalizes better than designing specialized architectures.'",
  "limitations": "What are the ACKNOWLEDGED weaknesses? Include: (1) Specific constraints mentioned by authors, (2) Applicability limits, (3) Computational or data requirements, (4) Assumptions that may not hold in practice. Example: 'Requires 300M+ parameters, making deployment on edge devices challenging; performance degrades on datasets with <10K samples; assumes clean, well-curated training data.'"
}

CRITICAL RULES:
- Do NOT use generic phrases like "novel approach", "improves performance", "experimental validation", "state-of-the-art results" WITHOUT specifying exactly what is novel/improved
- Extract ACTUAL domain-specific terms, exact algorithm names, specific metrics, and concrete numbers
- If specific numbers are not available, describe the type of results qualitatively but specifically (e.g., "significant improvement" → "statistically significant improvement with p<0.05")
- For methodology: name the actual technique (e.g., 'Transformer with multi-head attention', not 'deep learning approach')
- For contributions: be specific about what is different from prior work
- Keep responses factual and based ONLY on the provided text
- When information is not available in the text, state "Not mentioned in provided text" rather than making assumptions`;
}

/**
 * Step 2: Generate structured summary from analysis
 */
export function getSummaryPrompt(
  content: PaperContent,
  analysis: StructuredAnalysis,
  lengthLevel: 'short' | 'medium' | 'detailed'
): string {
  const lengthInstructions = {
    short: `Create a concise 2-3 sentence summary (~100 words) that MUST include:
1. The specific research problem/domain
2. The named method/technique proposed
3. A concrete quantitative result or specific contribution

Example format: "This paper addresses [specific problem] in [field] by proposing [method name], which achieves [specific result/metric]. The work contributes [specific advancement] to [area]."`,

    medium: `Create a comprehensive paragraph-style summary (~300-500 words) with these labeled sections:

## 研究背景 (Research Background)
- State the specific problem domain and gap

## 核心方法 (Core Methods)
- Name the specific algorithm, framework, or approach
- Explain what makes it technically distinct

## 主要结果 (Main Results)
- Include concrete numbers, metrics, or specific findings
- Compare to baselines or prior work if mentioned

## 关键结论 (Key Conclusions)
- State the specific contribution to the field
- Mention practical or theoretical implications`,

    detailed: `Create an in-depth structured summary (~800-1200 words) with these sections:

## 研究背景 (Research Background)
- Specific problem domain and motivation
- What gap in existing work this addresses

## 核心方法 (Core Methods)
- Technical details of the proposed approach
- Key innovations in the methodology
- How it differs from prior approaches

## 主要结果 (Main Results)
- Quantitative findings with specific metrics
- Experimental setup and comparisons
- Statistical significance or practical results

## 关键结论 (Key Conclusions)
- Theoretical contributions
- Practical applications
- Limitations and future directions`
  };

  return `You are an academic writing specialist. Generate a CONTENT-SPECIFIC summary based on the following analysis:

PAPER: ${content.title}

EXTRACTED ANALYSIS:
Research Question: ${analysis.research_question}
Methodology: ${analysis.methodology}
Key Results: ${analysis.key_results}
Contributions: ${analysis.contributions}
Limitations: ${analysis.limitations || 'Not specified'}

${lengthInstructions[lengthLevel]}

CRITICAL REQUIREMENTS:
- Use the SPECIFIC information from the analysis above
- Replace all generic placeholders with actual content
- Include domain-specific terminology and exact method names
- Preserve quantitative details (numbers, percentages, metrics)
- Do NOT add generic phrases like "novel approach" unless the analysis explicitly states novelty
- Make the summary concrete and informative`;
}

/**
 * Chat with paper - focused on understanding
 */
export function getChatPrompt(
  question: string,
  content: PaperContent,
  analysis?: StructuredAnalysis
): string {
  let context = `PAPER: ${content.title}\n\n`;

  if (analysis) {
    context += `QUICK REFERENCE:
- Problem: ${analysis.research_question}
- Method: ${analysis.methodology}
- Key Results: ${analysis.key_results}

`;
  }

  context += `ABSTRACT:
${content.abstract}

${content.introduction ? `INTRODUCTION:\n${content.introduction.substring(0, 800)}\n\n` : ''}${content.conclusion ? `CONCLUSION:\n${content.conclusion.substring(0, 500)}` : ''}`;

  return `${context}

QUESTION: ${question}

Instructions:
- Answer based ONLY on the paper content provided above
- If the information is not available in the text, clearly state that
- Be specific and reference actual details from the paper
- Avoid generic responses - quote or paraphrase specific content`;
}

/**
 * Quality check prompt to validate summary specificity
 */
export function getQualityCheckPrompt(summary: string): string {
  return `Check this summary for generic content. Flag if it contains:

1. Empty phrases like "novel approach", "improves performance", "state-of-the-art" WITHOUT specifics
2. Missing concrete method names or technical details
3. No quantitative results or specific findings
4. Generic statements that could apply to any paper

Summary to check:
"${summary.substring(0, 500)}"

Respond with:
- "SPECIFIC" if the summary contains concrete, paper-specific content
- "GENERIC" if the summary is too vague or generic
- Brief explanation (1 sentence) for your rating`;
}

/**
 * Extract key sections from full text
 */
export function extractKeySections(fullText: string): {
  abstract: string;
  introduction?: string;
  conclusion?: string;
} {
  const sections: any = { abstract: '' };

  // Extract abstract (usually before Introduction)
  const abstractMatch = fullText.match(/(?:Abstract|ABSTRACT)\s*\n(.*?)(?=\n\s*(?:Introduction|INTRODUCTION|1\.|Keywords))/s);
  if (abstractMatch) {
    sections.abstract = abstractMatch[1].trim();
  }

  // Extract introduction
  const introMatch = fullText.match(/(?:Introduction|INTRODUCTION)\s*\n(.*?)(?=\n\s*(?:Related Work|METHOD|Method|2\.|Conclusion))/s);
  if (introMatch) {
    sections.introduction = introMatch[1].trim();
  }

  // Extract conclusion
  const conclMatch = fullText.match(/(?:Conclusion|CONCLUSION|Conclusions|CONCLUSIONS)\s*\n(.*?)$/s);
  if (conclMatch) {
    sections.conclusion = conclMatch[1].trim();
  }

  return sections;
}
