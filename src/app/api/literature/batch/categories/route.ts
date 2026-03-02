import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature, literatureCategories, categories } from '@/db/schema';
import { z } from 'zod';
import { eq, and, inArray } from 'drizzle-orm';

const batchMoveSchema = z.object({
  literature_ids: z.array(z.number().int().positive()),
  category_id: z.number().int().positive(),
});

// POST /api/literature/batch/categories - Batch move literature to category
export async function POST(request: NextRequest) {
  try {
    // TODO: 从 JWT token 获取真实用户ID
    const userId = 1; // 测试用户ID

    const body = await request.json();

    // Validate request body
    const validation = batchMoveSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { literature_ids, category_id } = validation.data;

    // Verify category belongs to user
    const categoryList = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, category_id), eq(categories.user_id, userId)));

    if (categoryList.length === 0) {
      return NextResponse.json(
        { error: 'Category not found or access denied' },
        { status: 404 }
      );
    }

    // Verify all literature exist
    const literatureList = await db
      .select()
      .from(literature)
      .where(inArray(literature.id, literature_ids));

    if (literatureList.length !== literature_ids.length) {
      return NextResponse.json(
        { error: 'One or more literature not found' },
        { status: 404 }
      );
    }

    // Remove existing category associations for these literature
    await db
      .delete(literatureCategories)
      .where(inArray(literatureCategories.literature_id, literature_ids));

    // Add new category associations
    await db.insert(literatureCategories).values(
      literature_ids.map((litId) => ({
        literature_id: litId,
        category_id,
        created_at: new Date(),
      }))
    );

    return NextResponse.json({
      message: `Successfully moved ${literature_ids.length} literature to category`,
      count: literature_ids.length,
    });
  } catch (error) {
    console.error('Batch move literature error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
