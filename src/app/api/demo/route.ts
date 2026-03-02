import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature, userLiterature } from '@/db/schema';
import { verifyAuth } from '@/middleware';
import { eq } from 'drizzle-orm';

// POST /api/demo - 添加演示文献到当前用户的库
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const demoPapers = [
      {
        title: 'Attention Is All You Need',
        authors: [{ name: 'Vaswani, Ashish' }, { name: 'Shazeer, Noam' }, { name: 'Parmar, Niki' }],
        abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose a new simple network architecture, the Transformer.',
        doi: '10.arxiv.1706.03762',
        publication_date: '2017-06-12',
        journal: 'arXiv preprint',
        citation_count: 89432,
        source: 'semantic-scholar',
        keywords: ['attention', 'transformer', 'NLP'],
        notes: 'Transformer架构的开创性论文'
      },
      {
        title: 'BERT Pre-training of Deep Bidirectional Transformers',
        authors: [{ name: 'Devlin, Jacob' }, { name: 'Chang, Ming-Wei' }, { name: 'Lee, Kenton' }],
        abstract: 'We introduce BERT which stands for Bidirectional Encoder Representations from Transformers.',
        doi: '10.arxiv.1810.04805',
        publication_date: '2018-10-11',
        journal: 'arXiv preprint',
        citation_count: 74231,
        source: 'semantic-scholar',
        keywords: ['BERT', 'NLP', 'transformer'],
        notes: 'BERT模型论文'
      },
      {
        title: 'Deep Residual Learning for Image Recognition',
        authors: [{ name: 'He, Kaiming' }, { name: 'Zhang, Xiangyu' }, { name: 'Ren, Shaoqing' }],
        abstract: 'We present a residual learning framework to ease the training of networks that are substantially deeper.',
        doi: '10.1109/CVPR.2016.90',
        publication_date: '2015-12-10',
        journal: 'CVPR 2016',
        citation_count: 165982,
        source: 'semantic-scholar',
        keywords: ['ResNet', 'CNN', 'computer vision'],
        notes: 'ResNet架构'
      },
      {
        title: 'Machine Learning A Probabilistic Perspective',
        authors: [{ name: 'Murphy, Kevin P.' }],
        abstract: 'Today machine learning provides automated methods of data analysis that can detect patterns in data.',
        doi: '10.mitpress.93825',
        publication_date: '2012-08-24',
        journal: 'MIT Press',
        citation_count: 12847,
        source: 'semantic-scholar',
        keywords: ['machine learning', 'textbook'],
        notes: '机器学习经典教材'
      },
      {
        title: 'Understanding Deep Learning Generalization',
        authors: [{ name: 'Zhang, Chiyuan' }, { name: 'Bengio, Samy' }],
        abstract: 'Deep neural networks can easily fit random labels and their performance on test data is only slightly worse.',
        doi: '10.plrev.2016.003',
        publication_date: '2016-11-02',
        journal: 'arXiv preprint',
        citation_count: 2847,
        source: 'semantic-scholar',
        keywords: ['deep learning', 'generalization'],
        notes: '深度学习泛化研究'
      }
    ];

    const results = [];

    for (const paper of demoPapers) {
      try {
        // 检查是否已存在DOI
        const existing = await db
          .select()
          .from(literature)
          .where(eq(literature.doi, paper.doi));
        
        let literatureId: number;
        
        if (existing.length > 0) {
          literatureId = existing[0].id;
        } else {
          const newLit = await db
            .insert(literature)
            .values({
              title: paper.title,
              authors: JSON.stringify(paper.authors),
              abstract: paper.abstract || null,
              doi: paper.doi || null,
              publication_date: paper.publication_date || null,
              journal: paper.journal || null,
              citation_count: paper.citation_count,
              source: paper.source,
              keywords: paper.keywords ? JSON.stringify(paper.keywords) : null,
              created_at: new Date(),
              updated_at: new Date(),
            })
            .returning();
          
          literatureId = newLit[0].id;
        }

        // 保存到用户文献库
        try {
          await db
            .insert(userLiterature)
            .values({
              user_id: auth.userId,
              literature_id: literatureId,
              notes: paper.notes || null,
              created_at: new Date(),
            });
          results.push({ title: paper.title, status: 'success' });
        } catch (insertError: any) {
          // 如果已经存在，忽略错误
          if (insertError.message && insertError.message.includes('UNIQUE')) {
            results.push({ title: paper.title, status: 'exists' });
          } else {
            throw insertError;
          }
        }
      } catch (error) {
        console.error('Failed to save paper:', error);
        results.push({ title: paper.title, status: 'failed', error: String(error) });
      }
    }

    return NextResponse.json({
      message: '演示文献添加完成',
      results,
      total: results.length,
      success: results.filter(r => r.status === 'success').length
    });
  } catch (error) {
    console.error('Add demo error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
