/**
 * 统计 uploaded_papers.extracted_text 的字符数分布
 * 评估当前系统是否足以支持学术论文全文问答
 */

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { papers } from '../src/db/index-papers';

const client = createClient({ url: 'file:./sqlite.db' });
const db = drizzle(client);

interface PaperStats {
  id: number;
  title: string;
  extractedTextLength: number;
  summaryRetention: number; // 保留率
  chatRetention: number;
  summaryChars: number;
  chatChars: number;
}

async function analyzeTextStats() {
  console.log('📊 正在分析 uploaded_papers.extracted_text 统计信息...\n');

  // 1. 获取所有论文
  const allPapers = await db.select({
    id: papers.id,
    title: papers.title,
    extractedText: papers.extractedText,
  }).from(papers);

  console.log(`✅ 找到 ${allPapers.length} 篇论文\n`);

  // 2. 统计每篇论文（排除空文本）
  const stats: PaperStats[] = [];
  const summaryLimit = 25000; // 从 core-insights/route.ts
  const chatLimit = 12000; // 从 chat/route.ts

  allPapers.forEach(paper => {
    const textLength = paper.extractedText?.length || 0;

    // 跳过空文本
    if (textLength === 0) return;

    // Summary使用开头+结尾策略
    let summaryChars: number;
    if (textLength <= summaryLimit) {
      summaryChars = textLength;
    } else {
      const beginning = Math.min(18000, textLength);
      const ending = Math.min(7000, textLength - beginning);
      summaryChars = beginning + ending;
    }

    // Chat使用70%+30%策略
    let chatChars: number;
    if (textLength <= chatLimit) {
      chatChars = textLength;
    } else {
      const beginningLength = Math.min(Math.floor(textLength * 0.7), 8400);
      const endingLength = Math.min(textLength - beginningLength, 3600);
      chatChars = beginningLength + endingLength;
    }

    stats.push({
      id: paper.id,
      title: paper.title || 'Untitled',
      extractedTextLength: textLength,
      summaryRetention: (summaryChars / textLength) * 100,
      chatRetention: (chatChars / textLength) * 100,
      summaryChars,
      chatChars,
    });
  });

  // 3. 添加统计标题
  console.log(`📊 实际分析 ${stats.length} 篇有文本的论文（排除${allPapers.length - stats.length}篇空文本）\n`);

  // 4. 输出每篇论文的详细信息
  console.log('📄 每篇论文的详细信息：');
  console.log('='.repeat(120));
  console.log(
    `${'ID'.padEnd(6)} ${'Title'.padEnd(40)} ${'全文长度'.padEnd(12)} ${'Summary使用'.padEnd(12)} ${'保留率'.padEnd(10)} ${'Chat使用'.padEnd(12)} ${'保留率'.padEnd(10)}`
  );
  console.log('='.repeat(120));

  stats.forEach(stat => {
    const title = stat.title.length > 37 ? stat.title.substring(0, 37) + '...' : stat.title;
    console.log(
      `${String(stat.id).padEnd(6)} ${title.padEnd(40)} ${String(stat.extractedTextLength).padEnd(12)} ${String(stat.summaryChars).padEnd(12)} ${stat.summaryRetention.toFixed(1) + '%'.padEnd(10)} ${String(stat.chatChars).padEnd(12)} ${stat.chatRetention.toFixed(1) + '%'.padEnd(10)}`
    );
  });

  // 5. 计算总体统计
  const totalPapers = stats.length;
  if (totalPapers === 0) {
    console.log('⚠️  没有找到有文本的论文，无法分析。');
    process.exit(0);
  }

  const avgLength = stats.reduce((sum, s) => sum + s.extractedTextLength, 0) / totalPapers;
  const maxLength = Math.max(...stats.map(s => s.extractedTextLength));
  const minLength = Math.min(...stats.map(s => s.extractedTextLength));
  const avgSummaryRetention = stats.reduce((sum, s) => sum + s.summaryRetention, 0) / totalPapers;
  const avgChatRetention = stats.reduce((sum, s) => sum + s.chatRetention, 0) / totalPapers;

  console.log('\n' + '='.repeat(120));
  console.log('📈 总体统计：');
  console.log('='.repeat(120));
  console.log(`1. 平均字符数:          ${avgLength.toFixed(0)} 字符`);
  console.log(`2. 最大字符数:          ${maxLength.toLocaleString()} 字符`);
  console.log(`3. 最小字符数:          ${minLength.toLocaleString()} 字符`);
  console.log(`4. 平均Summary保留率:   ${avgSummaryRetention.toFixed(1)}%`);
  console.log(`5. 平均Chat保留率:      ${avgChatRetention.toFixed(1)}%`);

  // 6. 分布统计
  const shortPapers = stats.filter(s => s.extractedTextLength <= 25000).length;
  const mediumPapers = stats.filter(s => s.extractedTextLength > 25000 && s.extractedTextLength <= 50000).length;
  const longPapers = stats.filter(s => s.extractedTextLength > 50000 && s.extractedTextLength <= 100000).length;
  const veryLongPapers = stats.filter(s => s.extractedTextLength > 100000).length;

  console.log('\n' + '='.repeat(120));
  console.log('📊 论文长度分布：');
  console.log('='.repeat(120));
  console.log(`≤ 25,000字符 (Summary全量):    ${shortPapers}篇 (${(shortPapers / totalPapers * 100).toFixed(1)}%)`);
  console.log(`25,000 - 50,000字符:           ${mediumPapers}篇 (${(mediumPapers / totalPapers * 100).toFixed(1)}%)`);
  console.log(`50,000 - 100,000字符:          ${longPapers}篇 (${(longPapers / totalPapers * 100).toFixed(1)}%)`);
  console.log(`> 100,000字符 (信息损失大):    ${veryLongPapers}篇 (${(veryLongPapers / totalPapers * 100).toFixed(1)}%)`);

  // 7. 极端案例分析
  console.log('\n' + '='.repeat(120));
  console.log('⚠️  极端案例分析（保留率最低的3篇）：');
  console.log('='.repeat(120));

  const lowestRetention = [...stats]
    .sort((a, b) => a.summaryRetention - b.summaryRetention)
    .slice(0, 3);

  lowestRetention.forEach(stat => {
    const lostPercentage = (100 - stat.summaryRetention).toFixed(1);
    console.log(`\nPaper ${stat.id}: ${stat.title}`);
    console.log(`  全文: ${stat.extractedTextLength.toLocaleString()} 字符`);
    console.log(`  Summary使用: ${stat.summaryChars.toLocaleString()} 字符 (${stat.summaryRetention.toFixed(1)}%)`);
    console.log(`  ⚠️  信息损失: ${lostPercentage}% (${(stat.extractedTextLength - stat.summaryChars).toLocaleString()} 字符被省略)`);
    console.log(`  Chat使用: ${stat.chatChars.toLocaleString()} 字符 (${stat.chatRetention.toFixed(1)}%)`);
  });

  // 8. 系统评估
  console.log('\n' + '='.repeat(120));
  console.log('🔍 系统能力评估：');
  console.log('='.repeat(120));

  const avgSummaryLost = 100 - avgSummaryRetention;
  const avgChatLost = 100 - avgChatRetention;

  console.log('\n✅ 优点：');
  console.log('  - 简单高效，无需向量数据库');
  console.log('  - 开头+结尾策略覆盖论文关键部分（摘要、引言、方法、结论）');
  console.log('  - 适合快速获取论文概览和核心解读');

  console.log('\n⚠️  局限性：');
  console.log(`  - Summary平均损失 ${avgSummaryLost.toFixed(1)}% 的内容`);
  console.log(`  - Chat平均损失 ${avgChatLost.toFixed(1)}% 的内容`);
  console.log('  - 中间部分（Results、Discussion细节）可能被省略');
  console.log('  - 对于超长论文（>100k字符），信息损失超过70%');

  console.log('\n💡 结论：');
  if (avgSummaryRetention >= 50 && avgChatRetention >= 30) {
    console.log('  ✅ 当前系统可以支持基础的论文问答和核心解读');
    console.log('  ✅ 适合：快速浏览、核心观点提取、方法论理解');
    console.log('  ⚠️  不适合：细节数据分析、全文深度挖掘、精确段落引用');
  } else {
    console.log('  ⚠️  当前系统信息损失较大，建议考虑以下优化：');
    console.log('     1. 增加上下文窗口（25k → 50k或更多）');
    console.log('     2. 实现chunking + semantic search（RAG）');
    console.log('     3. 对超长论文进行分段处理');
  }

  console.log('\n' + '='.repeat(120));

  process.exit(0);
}

analyzeTextStats().catch(console.error);
