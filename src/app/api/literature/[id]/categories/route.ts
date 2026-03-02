import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature, literatureCategories, categories } from '@/db/schema';
import { verifyAuth } from '@/middleware';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';

// Validation schema
const addCategorySchema = z.object({
  category_id: z.number().int().positive('Category ID is required'),
});

// POST - Add literature to category
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 测试模式：使用固定用户ID
    const userId = 1; // 测试用户ID

    const literatureId = parseInt(params.id);
    if (isNaN(literatureId)) {
      return NextResponse.json(
        { error: 'Invalid literature ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = addCategorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { category_id } = validation.data;

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

    // Verify literature exists
    const litList = await db
      .select()
      .from(literature)
      .where(eq(literature.id, literatureId));

    if (litList.length === 0) {
      return NextResponse.json(
        { error: 'Literature not found' },
        { status: 404 }
      );
    }

    // Check if already in category
    const existing = await db
      .select()
      .from(literatureCategories)
      .where(
        and(
          eq(literatureCategories.literature_id, literatureId),
          eq(literatureCategories.category_id, category_id)
        )
      );

    if (existing.length > 0) {
      return NextResponse.json({
        message: 'Literature already in this category',
      });
    }

    // Add to category
    await db.insert(literatureCategories).values({
      literature_id: literatureId,
      category_id,
      created_at: new Date(),
    });

    return NextResponse.json({
      message: 'Literature added to category',
    });
  } catch (error) {
    console.error('Add literature to category error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove literature from category
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 测试模式：使用固定用户ID
    const userId = 1; // 测试用户ID

    const literatureId = parseInt(params.id);
    if (isNaN(literatureId)) {
      return NextResponse.json(
        { error: 'Invalid literature ID' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');

    if (!categoryId) {
      return NextResponse.json(
        { error: 'category_id query parameter is required' },
        { status: 400 }
      );
    }

    const categoryIdNum = parseInt(categoryId);
    if (isNaN(categoryIdNum)) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }

    // Verify category belongs to user
    const categoryList = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryIdNum), eq(categories.user_id, userId)));

    if (categoryList.length === 0) {
      return NextResponse.json(
        { error: 'Category not found or access denied' },
        { status: 404 }
      );
    }

    // Remove from category
    await db
      .delete(literatureCategories)
      .where(
        and(
          eq(literatureCategories.literature_id, literatureId),
          eq(literatureCategories.category_id, categoryIdNum)
        )
      );

    return NextResponse.json({
      message: 'Literature removed from category',
    });
  } catch (error) {
    console.error('Remove literature from category error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
