/**
 * Clean test/garbage data from the literature-finder DB.
 *
 * Modes:
 *   npx tsx scripts/clean-test-data.ts            # DRY-RUN (default, prints only)
 *   npx tsx scripts/clean-test-data.ts --execute  # actually delete
 *   npx tsx scripts/clean-test-data.ts --audit    # post-cleanup audit
 *
 * Deletion criteria (see CHORE-01 for full rationale):
 *   1. Test titles (regex)
 *   2. Empty shells (0 chunks AND empty extracted_text)
 *   3. Near-empty (≤1 chunk AND <2000 chars text)
 * Dedup: keep smallest id per duplicate title group.
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
const get = (k: string) => process.env[k] || '';

const args = new Set(process.argv.slice(2));
const EXECUTE = args.has('--execute');
const AUDIT = args.has('--audit');

// Test-title regex (anchored, exact match on common test names).
const TEST_TITLE = /^(GT4|cynisim|cynisim zh|Test|test|Final Test|Test PDF|Test PDF Upload|regression test|Cynicism Test|Cynicism Test PDF|Untitled)$/;

(async () => {
  const db = createClient({ url: get('DATABASE_URL') });

  if (AUDIT) {
    console.log('=== 清理后审计 ===\n');
    const papers = await db.execute(`
      SELECT p.id, p.title,
             (SELECT COUNT(*) FROM paper_chunks c WHERE c.paper_id = p.id) AS chunks,
             (SELECT COUNT(*) FROM chunk_embeddings ce WHERE ce.chunk_id IN (SELECT id FROM paper_chunks WHERE paper_id = p.id)) AS embs
      FROM uploaded_papers p ORDER BY p.id
    `);
    console.log(`uploaded_papers: ${(papers.rows as any[]).length} 篇`);
    let orphanChunks = 0, orphanEmbs = 0;
    (papers.rows as any[]).forEach((r) => {
      if (r.chunks === 0) orphanChunks++;
      if (r.embs > 0 && r.chunks === 0) orphanEmbs++;
      console.log(`  #${r.id} chunks=${r.chunks} embs=${r.embs}  ${r.title.slice(0, 50)}`);
    });
    // Check for orphan chunks (chunk whose paper was deleted)
    const orph = await db.execute(`SELECT COUNT(*) c FROM paper_chunks WHERE paper_id NOT IN (SELECT id FROM uploaded_papers)`);
    console.log(`\n孤儿 chunks(指向已删论文): ${(orph.rows[0] as any).c}`);
    console.log(`孤儿 embeddings 检查:`);
    const orphE = await db.execute(`SELECT COUNT(*) c FROM chunk_embeddings WHERE chunk_id NOT IN (SELECT id FROM paper_chunks)`);
    console.log(`  ${(orphE.rows[0] as any).c}`);
    await db.close();
    process.exit(0);
  }

  // Load all papers with chunk count and text length.
  const rows = await db.execute(`
    SELECT p.id, p.title,
           LENGTH(p.extracted_text) AS text_len,
           (SELECT COUNT(*) FROM paper_chunks c WHERE c.paper_id = p.id) AS chunk_count
    FROM uploaded_papers p ORDER BY p.id
  `);
  const all = rows.rows as any[];

  // --- Determine deletions ---
  const toDelete = new Set<number>();
  const reasons = new Map<number, string>();

  for (const r of all) {
    let reason = '';
    if (TEST_TITLE.test(r.title.trim())) reason = '测试标题';
    else if (r.chunk_count === 0 && r.text_len === 0) reason = '空壳(无chunks无文本)';
    else if (r.chunk_count <= 1 && r.text_len < 2000) reason = '极少内容(chunks≤1,text<2KB)';
    if (reason) { toDelete.add(r.id); reasons.set(r.id, reason); }
  }

  // --- Dedup: keep smallest id per title group (only for non-already-deleted) ---
  const titleMap = new Map<string, number[]>();
  for (const r of all) {
    if (toDelete.has(r.id)) continue; // skip already-marked
    if (!titleMap.has(r.title)) titleMap.set(r.title, []);
    titleMap.get(r.title)!.push(r.id);
  }
  let dedupCount = 0;
  for (const [title, ids] of titleMap) {
    if (ids.length > 1) {
      ids.sort((a, b) => a - b);
      const keep = ids[0];
      for (const id of ids.slice(1)) {
        toDelete.add(id);
        reasons.set(id, `重复(保留#${keep})`);
        dedupCount++;
      }
    }
  }

  const keepCount = all.length - toDelete.size;
  const testReasonCount = Array.from(reasons.values()).filter(r => r.startsWith('测试')).length;
  const emptyReasonCount = Array.from(reasons.values()).filter(r => r.startsWith('空壳') || r.startsWith('极少')).length;

  console.log(`\n=== ${EXECUTE ? '🟠 执行清理' : '🔵 DRY-RUN(未执行)'} ===\n`);
  console.log(`总数: ${all.length} 篇`);
  console.log(`将删除: ${toDelete.size} 篇  (测试标题 ${testReasonCount}, 空壳/极少 ${emptyReasonCount}, 重复 ${dedupCount})`);
  console.log(`将保留: ${keepCount} 篇\n`);

  // Count related chunks/embeddings that will cascade-delete.
  const idsArr = Array.from(toDelete);
  if (idsArr.length > 0) {
    const placeholders = idsArr.map(() => '?').join(',');
    const chunkR = await db.execute({ sql: `SELECT COUNT(*) c FROM paper_chunks WHERE paper_id IN (${placeholders})`, args: idsArr });
    const embR = await db.execute({
      sql: `SELECT COUNT(*) c FROM chunk_embeddings WHERE chunk_id IN (SELECT id FROM paper_chunks WHERE paper_id IN (${placeholders}))`,
      args: idsArr,
    });
    console.log(`级联清理: chunks ${(chunkR.rows[0] as any).c} 条, embeddings ${(embR.rows[0] as any).c} 条\n`);
  }

  console.log('删除清单:');
  for (const id of idsArr.sort((a, b) => a - b)) {
    const r = all.find(x => x.id === id)!;
    console.log(`  🔴 #${id} [${reasons.get(id)}] "${r.title.slice(0, 45)}" chunks=${r.chunk_count}`);
  }

  console.log('\n保留清单:');
  for (const r of all.filter(x => !toDelete.has(x.id))) {
    console.log(`  🟢 #${r.id} "${r.title.slice(0, 45)}" chunks=${r.chunk_count}`);
  }

  if (!EXECUTE) {
    console.log('\n⚠️ 以上为 DRY-RUN 预览,未执行删除。');
    console.log('   确认无误后运行: npx tsx scripts/clean-test-data.ts --execute');
    await db.close();
    process.exit(0);
  }

  // --- Execute deletion ---
  console.log('\n执行删除...');
  for (const id of idsArr) {
    // chunk_embeddings has chunk_id PK referencing paper_chunks (cascade).
    // paper_chunks has paper_id referencing uploaded_papers (cascade).
    // But libsql may not enforce cascade reliably — delete explicitly to be safe.
    await db.execute({
      sql: `DELETE FROM chunk_embeddings WHERE chunk_id IN (SELECT id FROM paper_chunks WHERE paper_id = ?)`,
      args: [id],
    });
    await db.execute({ sql: `DELETE FROM paper_chunks WHERE paper_id = ?`, args: [id] });
    await db.execute({ sql: `DELETE FROM uploaded_papers WHERE id = ?`, args: [id] });
  }
  console.log(`✅ 已删除 ${idsArr.length} 篇测试/重复论文(及其关联数据)`);

  const after = await db.execute('SELECT COUNT(*) c FROM uploaded_papers');
  console.log(`清理后 uploaded_papers: ${(after.rows[0] as any).c} 篇`);

  await db.close();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
