import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { categories } from '@/db/schema';
import { verifyAuth } from '@/middleware';
import { z } from 'zod';
import { eq, asc, ne } from 'drizzle-orm';

// 默认分类列表
const DEFAULT_CATEGORIES = [
  { name: '未分类', sort_order: 0 },
  { name: '待读', sort_order: 1 },
  { name: '已读', sort_order: 2 },
  { name: '重要', sort_order: 3 },
  { name: '引用中', sort_order: 4 },
];

// Validation schema
const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  sort_order: z.number().int().min(0).optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  sort_order: z.number().int().min(0).optional(),
});

// GET - Retrieve user categories
export async function GET(request: NextRequest) {
  try {
    // TODO: 从 JWT token 获取真实用户ID
    const userId = 1; // 测试用户ID

    // Get user's categories
    const userCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.user_id, userId))
      .orderBy(asc(categories.sort_order), asc(categories.id));

    // If no categories exist, create default categories
    if (userCategories.length === 0) {
      const newCategories = await db
        .insert(categories)
        .values(
          DEFAULT_CATEGORIES.map((cat) => ({
            user_id: userId,
            name: cat.name,
            sort_order: cat.sort_order,
            is_default: true,
            created_at: new Date(),
            updated_at: new Date(),
          }))
        )
        .returning();

      return NextResponse.json({
        categories: newCategories,
      });
    }

    return NextResponse.json({
      categories: userCategories,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create category
export async function POST(request: NextRequest) {
  try {
    // TODO: 从 JWT token 获取真实用户ID
    const userId = 1; // 测试用户ID

    const body = await request.json();

    // Validate request body
    const validation = createCategorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { name, sort_order } = validation.data;

    // Get current max sort_order if not provided
    let finalSortOrder = sort_order;
    if (finalSortOrder === undefined) {
      const maxOrder = await db
        .select({ sort_order: categories.sort_order })
        .from(categories)
        .where(eq(categories.user_id, userId))
        .orderBy(asc(categories.sort_order))
        .limit(1);

      finalSortOrder = (maxOrder[0]?.sort_order ?? 0) + 1;
    }

    // Create category
    const newCategory = await db
      .insert(categories)
      .values({
        user_id: userId,
        name,
        sort_order: finalSortOrder,
        is_default: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    return NextResponse.json(
      {
        message: 'Category created',
        category: newCategory[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
