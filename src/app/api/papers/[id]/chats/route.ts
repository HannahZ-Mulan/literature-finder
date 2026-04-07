/**
 * 对话历史 API - 保存和加载对话历史
 */

import { NextRequest, NextResponse } from 'next/server';

// GET - 获取对话历史
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paperId = parseInt(params.id);
    if (isNaN(paperId)) {
      return NextResponse.json({ error: 'Invalid paper ID' }, { status: 400 });
    }

    const { db } = await import('@/db');
    const { paperChats } = await import('@/db/schema-papers');
    const { eq } = await import('drizzle-orm');

    const chats = await db
      .select()
      .from(paperChats)
      .where(eq(paperChats.paperId, paperId))
      .orderBy(paperChats.createdAt);

    return NextResponse.json({
      chats: chats.map(chat => ({
        role: chat.role,
        content: chat.content,
      })),
    });
  } catch (error) {
    console.error('[Chats GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}

// POST - 保存对话消息
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paperId = parseInt(params.id);
    if (isNaN(paperId)) {
      return NextResponse.json({ error: 'Invalid paper ID' }, { status: 400 });
    }

    const body = await request.json();
    const { role, content } = body;

    if (!role || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: role, content' },
        { status: 400 }
      );
    }

    if (!['user', 'assistant', 'system'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be user, assistant, or system' },
        { status: 400 }
      );
    }

    const { db } = await import('@/db');
    const { paperChats } = await import('@/db/schema-papers');

    const result = await db
      .insert(paperChats)
      .values({
        paperId,
        role,
        content,
      })
      .returning();

    return NextResponse.json({
      success: true,
      chat: result[0],
    });
  } catch (error) {
    console.error('[Chats POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save chat message' },
      { status: 500 }
    );
  }
}

// DELETE - 清空对话历史
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paperId = parseInt(params.id);
    if (isNaN(paperId)) {
      return NextResponse.json({ error: 'Invalid paper ID' }, { status: 400 });
    }

    const { db } = await import('@/db');
    const { paperChats } = await import('@/db/schema-papers');
    const { eq } = await import('drizzle-orm');

    await db.delete(paperChats).where(eq(paperChats.paperId, paperId));

    return NextResponse.json({
      success: true,
      message: 'Chat history cleared',
    });
  } catch (error) {
    console.error('[Chats DELETE] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear chat history' },
      { status: 500 }
    );
  }
}
