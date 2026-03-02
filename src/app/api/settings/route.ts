import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { verifyAuth } from '@/middleware';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

// Validation schema for updating settings
const updateSettingsSchema = z.object({
  summary_length_level: z.enum(['short', 'medium', 'detailed']).optional(),
  default_export_format: z.enum(['bibtex', 'apa', 'mla', 'chicago']).optional(),
  notification_preferences: z.string().optional(),
});

// GET - Retrieve user settings
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json(
        { error: auth.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = auth.userId;

    // Get user settings
    const settingsList = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.user_id, userId));

    // If no settings exist, return defaults
    if (settingsList.length === 0) {
      return NextResponse.json({
        settings: {
          summary_length_level: 'medium',
          default_export_format: 'bibtex',
          notification_preferences: null,
        },
      });
    }

    return NextResponse.json({
      settings: settingsList[0],
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create or update user settings
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json(
        { error: auth.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = updateSettingsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { summary_length_level, default_export_format, notification_preferences } = validation.data;
    const userId = auth.userId;

    // Check if settings already exist
    const existing = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.user_id, userId));

    if (existing.length > 0) {
      // Update existing settings
      const updateData: any = {};
      if (summary_length_level !== undefined) updateData.summary_length_level = summary_length_level;
      if (default_export_format !== undefined) updateData.default_export_format = default_export_format;
      if (notification_preferences !== undefined) updateData.notification_preferences = notification_preferences;
      updateData.updated_at = new Date();

      await db
        .update(userSettings)
        .set(updateData)
        .where(eq(userSettings.user_id, userId));

      const updated = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.user_id, userId));

      return NextResponse.json({
        message: 'Settings updated',
        settings: updated[0],
      });
    } else {
      // Create new settings
      const newSettings = await db
        .insert(userSettings)
        .values({
          user_id: userId,
          summary_length_level: summary_length_level || 'medium',
          default_export_format: default_export_format || 'bibtex',
          notification_preferences: notification_preferences || null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      return NextResponse.json(
        {
          message: 'Settings created',
          settings: newSettings[0],
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Save settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
