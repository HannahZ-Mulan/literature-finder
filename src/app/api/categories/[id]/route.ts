import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { categories, literatureCategories } from '@/db/schema';
import { z } from 'zod';
import { eq, and, count, desc } from 'drizzle-orm';

const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  sort_order: z.number().int().min(0).optional(),
});

// GET /api/categories/[id] - Get single category
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = parseInt(params.id);
    if (isNaN(categoryId)) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }

    const categoryList = await db
      .select()
      .from(categories)
      .where(eq(categories.id, categoryId));

    if (categoryList.length === 0) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      category: categoryList[0],
    });
  } catch (error) {
    console.error('Get category error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/categories/[id] - Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = parseInt(params.id);
    if (isNaN(categoryId)) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }

    // TODO: 从 JWT token 获取真实用户ID
    const userId = 1; // 测试用户ID

    const body = await request.json();

    // Validate request body
    const validation = updateCategorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    // Check if category exists and belongs to user
    const existingCategory = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.user_id, userId)));

    if (existingCategory.length === 0) {
      return NextResponse.json(
        { error: 'Category not found or access denied' },
        { status: 404 }
      );
    }

    // Prevent modifying sort_order of default categories
    if (existingCategory[0].is_default && body.sort_order !== undefined) {
      return NextResponse.json(
        { error: 'Cannot modify sort_order of default categories' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updated_at: new Date(),
    };

    if (body.name !== undefined) {
      updateData.name = body.name;
    }

    if (body.sort_order !== undefined && !existingCategory[0].is_default) {
      updateData.sort_order = body.sort_order;
    }

    // Update category
    const updated = await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, categoryId))
      .returning();

    return NextResponse.json({
      message: 'Category updated',
      category: updated[0],
    });
  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = parseInt(params.id);
    if (isNaN(categoryId)) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }

    // TODO: 从 JWT token 获取真实用户ID
    const userId = 1; // 测试用户ID

    // Check if category exists and belongs to user
    const existingCategory = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.user_id, userId)));

    if (existingCategory.length === 0) {
      return NextResponse.json(
        { error: 'Category not found or access denied' },
        { status: 404 }
      );
    }

    // Prevent deleting default categories
    if (existingCategory[0].is_default) {
      return NextResponse.json(
        { error: 'Cannot delete default categories' },
        { status: 400 }
      );
    }

    // Check if category has literature
    const literatureCount = await db
      .select({ count: count() })
      .from(literatureCategories)
      .where(eq(literatureCategories.category_id, categoryId));

    if (literatureCount[0].count > 0) {
      return NextResponse.json(
        {
          error: 'Category is not empty',
          message: 'Please move all literature out of this category before deleting',
          count: literatureCount[0].count,
        },
        { status: 400 }
      );
    }

    // Delete category
    await db.delete(categories).where(eq(categories.id, categoryId));

    return NextResponse.json({
      message: 'Category deleted',
    });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
