import { getChunksByPaperId } from '@/lib/chunker/chunk-storage';
import {
  calculateRelevanceScore,
  normalizeQuery
} from '@/lib/search/keyword-extractor';

export interface RetrievedChunk {
  chunkId: number;
  chunkType: string;
  chunkText: string;
  relevanceScore: number;
  charStart: number;
}

/**
 * 检索与查询最相关的 chunks(RAG 检索层)
 *
 * 用于 chat 问答前的上下文召回:从论文已分块的章节中,按关键词相关性
 * 打分,返回 top-K 段落。复用 Day 1 的分块数据 + Day 3 的打分算法。
 *
 * @param query - 用户问题
 * @param paperId - 论文 ID
 * @param limit - 返回的最大 chunk 数(默认 5)
 * @returns 按相关性降序排列的 chunks;无匹配时返回空数组(由调用方兜底)
 */
export async function retrieveRelevantChunks(
  query: string,
  paperId: number,
  limit: number = 5
): Promise<RetrievedChunk[]> {
  // 取该论文的全部 chunks(已按 char_start 排序,即文档顺序)
  const chunks = await getChunksByPaperId(paperId);

  if (chunks.length === 0) {
    return [];
  }

  // 规范化查询词(去停用词、转小写)
  const queryTerms = normalizeQuery(query);
  if (queryTerms.length === 0) {
    return [];
  }

  // 打分并过滤零分 chunk
  const scored = chunks
    .map(chunk => {
      const score = calculateRelevanceScore(
        chunk.chunk_text,
        query,
        chunk.chunk_type
      );
      return {
        chunkId: chunk.id,
        chunkType: chunk.chunk_type,
        chunkText: chunk.chunk_text,
        relevanceScore: score,
        charStart: chunk.char_start
      };
    })
    .filter(chunk => chunk.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);

  return scored;
}
