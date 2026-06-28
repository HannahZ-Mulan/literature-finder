/**
 * Migrate existing uploaded_papers into the literature system.
 *
 * For each uploaded paper without a literature_id, creates a corresponding
 * row in `literature` and back-fills uploaded_papers.literature_id.
 * Idempotent: skips papers that already have literature_id set.
 *
 * Run:  npx tsx scripts/migrate-papers-to-literature.ts
 */
import { readFileSync } from 'fs';
import { createClient } from '@libsql/client';

const env = readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const e = t.indexOf('=');
  if (e === -1) continue;
  const k = t.slice(0, e).trim();
  const v = t.slice(e + 1).replace(/^["']|["']$/g, '');
  if (!process.env[k]) process.env[k] = v;
}

(async () => {
  const db = createClient({ url: process.env.DATABASE_URL! });

  console.log('=== 迁移 uploaded_papers → literature ===\n');

  // Find papers needing migration.
  const todo = await db.execute(
    "SELECT id, title, file_name, abstract, extracted_text FROM uploaded_papers WHERE literature_id IS NULL ORDER BY id"
  );
  const papers = todo.rows as any[];

  // Count current literature rows (for telemetry).
  const beforeR = await db.execute('SELECT COUNT(*) c FROM literature');
  const before = (beforeR.rows[0] as any).c;

  console.log(`当前 literature 表: ${before} 条`);
  console.log(`待迁移论文: ${papers.length} 篇\n`);

  if (papers.length === 0) {
    console.log('✅ 全部已迁移,无需操作');
    await db.close();
    process.exit(0);
  }

  let migrated = 0;
  let failed = 0;

  for (const paper of papers) {
    try {
      // Field mapping per SPEC-003:
      //   title    ← paper.title
      //   authors  ← '[]' (JSON empty array; authors unknown for uploads)
      //   abstract ← paper.abstract or first 500 chars of extracted_text
      //   source   ← 'upload'
      //   pdf_url  ← paper.file_name (local file identifier)
      //   doi/journal/volume/issue/pages ← NULL
      //   citation_count ← 0
      const abstract = paper.abstract || (paper.extracted_text ? String(paper.extracted_text).slice(0, 500) : null);

      const insertResult = await db.execute({
        sql: `INSERT INTO literature (title, authors, abstract, doi, publication_date, journal, volume, issue, pages, citation_count, source, keywords, pdf_url)
              VALUES (?, '[]', ?, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'upload', NULL, ?)`,
        args: [paper.title, abstract, paper.file_name],
      });

      // libsql returns lastInsertRowid on the meta for the client.
      const litId = (insertResult as any).lastInsertRowid || (insertResult as any).meta?.last_insert_rowid;
      if (!litId) {
        throw new Error('Could not retrieve inserted literature id');
      }

      // Back-fill the link.
      await db.execute({
        sql: 'UPDATE uploaded_papers SET literature_id = ? WHERE id = ?',
        args: [Number(litId), paper.id],
      });

      migrated++;
      console.log(`  ✅ #${paper.id} "${String(paper.title).slice(0, 40)}" → literature #${litId}`);
    } catch (e: any) {
      failed++;
      console.error(`  ❌ #${paper.id} 失败: ${e.message?.slice(0, 100)}`);
    }
  }

  const afterR = await db.execute('SELECT COUNT(*) c FROM literature');
  const after = (afterR.rows[0] as any).c;

  console.log(`\n=== 完成 ===`);
  console.log(`迁移成功: ${migrated}  失败: ${failed}`);
  console.log(`literature 表: ${before} → ${after}`);

  // Verify back-fill.
  const verify = await db.execute(
    "SELECT id, title, literature_id FROM uploaded_papers WHERE literature_id IS NULL"
  );
  const unlinked = (verify.rows as any[]).length;
  console.log(`未关联(literature_id IS NULL)的论文: ${unlinked}`);
  if (unlinked === 0) console.log('✅ 全部论文已获得 literature 身份');

  await db.close();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
