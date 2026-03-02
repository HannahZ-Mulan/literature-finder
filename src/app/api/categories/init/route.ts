import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { categories } from '@/db/schema';
import { eq } from 'drizzle-orm';

// 默认分类列表
const DEFAULT_CATEGORIES = [
  { name: '未分类', sort_order: 0 },
  { name: '待读', sort_order: 1 },
  { name: '已读', sort_order: 2 },
  { name: '重要', sort_order: 3 },
  { name: '引用中', sort_order: 4 },
];

// POST /api/categories/init - 初始化用户的默认分类
export async function POST(request: NextRequest) {
  try {
    // TODO: 从 JWT token 获取真实用户ID
    const userId = 1; // 测试用户ID

    // 检查用户是否已有分类
    const existingCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.user_id, userId));

    if (existingCategories.length > 0) {
      return NextResponse.json({
        message: 'Categories already exist',
        categories: existingCategories,
      });
    }

    // 创建默认分类
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
      message: 'Default categories created',
      categories: newCategories,
    });
  } catch (error) {
    console.error('Initialize categories error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
