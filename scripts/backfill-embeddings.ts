/**
 * Backfill chunk embeddings for semantic search.
 *
 * Idempotent + resumable: skips chunks that already have an embedding row,
 * so re-running after interruption picks up where it left off.
 *
 * Run:  npx tsx scripts/backfill-embeddings.ts
 */
import { readFileSync } from 'fs';
import { createClient } from '@libsql/client';
import { generateEmbedding } from '../src/lib/ai/embeddings';

const EMBEDDING_MODEL = 'embedding-3';
const MAX_TEXT_CHARS = 6000; // embedding-3 single-text limit ~3072 tokens

// Load env manually (no dotenv dependency).
const env = readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const val = trimmed.slice(eq + 1).replace(/^["']|["']$/g, '');
  if (!process.env[key]) process.env[key] = val;
}
const getEnv = (k: string) => process.env[k] || '';

async function main() {
  console.log('=== 回填 chunk embeddings ===\n');

  if (!getEnv('ZHIPU_API_KEY')) {
    console.error('❌ ZHIPU_API_KEY 未配置');
    process.exit(1);
  }

  const db = createClient({ url: getEnv('DATABASE_URL') });

  // Find chunks without an embedding (LEFT JOIN anti-pattern, idempotent).
  const todo = await db.execute(`
    SELECT pc.id, pc.chunk_type, pc.chunk_text
    FROM paper_chunks pc
    LEFT JOIN chunk_embeddings ce ON ce.chunk_id = pc.id
    WHERE ce.chunk_id IS NULL
    ORDER BY pc.id
  `);
  const chunks = todo.rows as any[];
  const total = chunks.length;

  const totalRows = await db.execute('SELECT COUNT(*) c FROM paper_chunks');
  const totalChunks = (totalRows.rows[0] as any).c;
  console.log(`paper_chunks 总数: ${totalChunks}`);
  console.log(`已有 embedding: ${totalChunks - total}`);
  console.log(`待回填: ${total}\n`);

  if (total === 0) {
    console.log('✅ 全部已回填,无需操作');
    await db.close();
    process.exit(0);
  }

  let done = 0;
  let failed = 0;
  const t0 = Date.now();

  for (const chunk of chunks) {
    try {
      const text = String(chunk.chunk_text).slice(0, MAX_TEXT_CHARS);
      const embedding = await generateEmbedding(text);
      await db.execute({
        sql: `INSERT OR REPLACE INTO chunk_embeddings (chunk_id, embedding, model, created_at) VALUES (?, ?, ?, unixepoch())`,
        args: [chunk.id, JSON.stringify(embedding), EMBEDDING_MODEL],
      });
      done++;
      // Progress every 10 items.
      if (done % 10 === 0 || done === total) {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`  进度 ${done}/${total}  (${elapsed}s)  最近: chunk#${chunk.id} [${chunk.chunk_type}]`);
      }
    } catch (e: any) {
      failed++;
      console.error(`  ❌ chunk#${chunk.id} [${chunk.chunk_type}] 失败: ${e.message.slice(0, 100)}`);
      // Continue with next chunk; one failure shouldn't abort the whole run.
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n=== 完成 ===`);
  console.log(`成功: ${done}  失败: ${failed}  耗时: ${elapsed}s`);
  if (failed > 0) console.log('⚠️ 有失败项,可重新运行脚本(幂等,会只补失败的)');

  await db.close();
  process.exit(0);
}

main().catch((e) => {
  console.error('回填失败:', e);
  process.exit(1);
});
