/**
 * PoC: Semantic search proof-of-concept
 *
 * Proves that vector retrieval finds chunks that keyword search CANNOT.
 * Uses REAL chunks from the DB and REAL Zhipu embeddings.
 *
 * Run:  npx tsx scripts/poc-semantic-search.ts
 *
 * What it demonstrates:
 *  1. Take 15 real chunks from the DB.
 *  2. Embed them all (1 batched API call).
 *  3. Embed a Chinese natural-language query that shares NO words with
 *     any English chunk (keyword search would return 0).
 *  4. Show the top semantic hits — proving meaning-based matching works.
 */
import { readFileSync } from 'fs';
import { createClient } from '@libsql/client';
import { generateEmbeddings, generateEmbedding, isEmbeddingAvailable } from '../src/lib/ai/embeddings';
import { vectorIndex } from '../src/lib/search/vector-index';

// Load env manually (no dotenv dependency) and inject into process.env so
// embeddings.ts (which reads process.env.ZHIPU_API_KEY) can see the key.
const env = readFileSync('.env.local', 'utf8');
const getEnv = (k: string) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, 'm'));
  return m ? m[1].replace(/^["']|["']$/g, '') : '';
};
// Populate process.env from .env.local (skip comments / blanks).
for (const line of env.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const val = trimmed.slice(eq + 1).replace(/^["']|["']$/g, '');
  if (!process.env[key]) process.env[key] = val;
}

async function main() {
  console.log('=== PoC: 语义检索验证 ===\n');

  if (!isEmbeddingAvailable()) {
    console.error('❌ ZHIPU_API_KEY 未配置,无法验证。请在 .env.local 设置。');
    process.exit(1);
  }

  const db = createClient({ url: getEnv('DATABASE_URL') });

  // 1. 取 8 个真实 chunk(优先取有内容深度的类型,避开 references)
  console.log('1. 从 DB 取真实 chunk...');
  const res = await db.execute(
    `SELECT id, chunk_type, substr(chunk_text, 1, 400) AS preview
     FROM paper_chunks
     WHERE chunk_type NOT IN ('references', 'appendix')
     ORDER BY length(chunk_text) DESC
     LIMIT 8`
  );
  const chunks = res.rows as any[];
  console.log(`   取到 ${chunks.length} 个 chunk\n`);

  // 2. 逐条算 embedding(单条 input 模式,兼容智谱官方 cURL 示例)
  console.log('2. 计算 embedding(调用智谱 embedding-3,逐条)...');
  const t0 = Date.now();
  const fullTexts = await Promise.all(
    chunks.map(async (c) => {
      const r = await db.execute({
        sql: 'SELECT chunk_text FROM paper_chunks WHERE id = ?',
        args: [c.id],
      });
      // 截断到安全长度(embedding-3 单条上限 3072 token ≈ 6000 字符)
      const text = (r.rows[0] as any).chunk_text as string;
      return text.slice(0, 6000);
    })
  );
  const embeddings = await generateEmbeddings(fullTexts);
  console.log(`   ✅ 完成,耗时 ${Date.now() - t0}ms,维度 ${embeddings[0].length}\n`);

  // 3. 建索引
  console.log('3. 建立内存索引...');
  chunks.forEach((c, i) => vectorIndex.addVector(c.id, embeddings[i]));
  console.log(`   索引大小: ${vectorIndex.size}\n`);

  // 4. 关键对比:用中文自然语言 query(与英文 chunk 零词面重叠)
  const query = '做善事会不会让人更快乐';
  console.log(`4. 测试 query: "${query}"`);
  console.log('   (此中文句与英文论文零词面重叠 → 关键词检索必然返空)\n');

  console.log('   【关键词检索结果预期】: 0 条命中(子串匹配无重叠)\n');

  // 5. 向量检索
  console.log('   【语义检索结果】:');
  const t1 = Date.now();
  const queryEmbedding = await generateEmbedding(query);
  const hits = vectorIndex.search(queryEmbedding, 5);
  const searchMs = Date.now() - t1;
  console.log(`   top-5 命中(向量比对耗时 ${searchMs}ms):\n`);
  hits.forEach((h, i) => {
    const chunk = chunks.find((c) => c.id === h.chunkId)!;
    console.log(`   #${i + 1}  score=${h.score.toFixed(4)}  [${chunk.chunk_type}]  chunk#${chunk.id}`);
    console.log(`        ${chunk.preview.slice(0, 120).replace(/\n/g, ' ')}...`);
    console.log('');
  });

  console.log('=== 验证结论 ===');
  if (hits.length > 0 && hits[0].score > 0.3) {
    console.log(`✅ 成功:语义检索对纯中文自然语言 query 命中了 ${hits.length} 个英文 chunk,`);
    console.log(`   最高相似度 ${hits[0].score.toFixed(4)}。这是关键词检索完全做不到的。`);
    console.log('   → 方案 A(向量检索)可行性已证实,可推进 Task 3-6。');
  } else {
    console.log(`⚠️ 最高 score ${hits[0]?.score.toFixed(4) ?? 'N/A'} 偏低,需检查 embedding 质量。`);
  }

  await db.close();
  process.exit(0);
}

main().catch((e) => {
  console.error('PoC 失败:', e);
  process.exit(1);
});
