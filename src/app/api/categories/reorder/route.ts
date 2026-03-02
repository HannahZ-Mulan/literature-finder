import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { categories } from '@/db/schema';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';

const reorderSchema = z.object({
  orders: z.array(
    z.object({
      id: z.number().int().positive(),
      sort_order: z.number().int().min(0),
    })
  ),
});

// POST /api/categories/reorder - Batch update category sort orders
export async function POST(request: NextRequest) {
  try {
    // TODO: 从 JWT token 获取真实用户ID
    const userId = 1; // 测试用户ID

    const body = await request.json();

    // Validate request body
    const validation = reorderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { orders } = validation.data;

    // Update each category's sort_order
    for (const order of orders) {
      // Verify category belongs to user
      const existing = await db
        .select()
        .from(categories)
        .where(and(eq(categories.id, order.id), eq(categories.user_id, userId)));

      if (existing.length === 0) {
        continue; // Skip if not found or doesn't belong to user
      }

      // Prevent modifying default categories' sort_order
      if (existing[0].is_default) {
        continue;
      }

      // Update sort_order
      await db
        .update(categories)
        .set({
          sort_order: order.sort_order,
          updated_at: new Date(),
        })
        .where(eq(categories.id, order.id));
    }

    return NextResponse.json({
      message: 'Categories reordered',
    });
  } catch (error) {
    console.error('Reorder categories error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
