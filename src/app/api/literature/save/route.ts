import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature, userLiterature } from '@/db/schema';
import { eq, and, or, like } from 'drizzle-orm';
import { z } from 'zod';
import { apiCache } from '@/lib/cache/api-cache';

// Validation schema
const saveLiteratureSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  authors: z.array(z.object({ name: z.string() })),
  abstract: z.string().optional(),
  doi: z.string().optional(),
  publication_date: z.string().optional(),
  journal: z.string().optional(),
  citation_count: z.number().optional(),
  source: z.string(), // arxiv, pubmed, semantic-scholar
  keywords: z.array(z.string()).optional(),
  pdf_url: z.string().nullable().optional(), // PDF URL
  notes: z.string().optional(), // User's personal notes
});

// Helper function to check if two titles are similar (basic implementation)
function areTitlesSimilar(title1: string, title2: string): boolean {
  const clean1 = title1.toLowerCase().trim().replace(/[^\w\s]/g, '');
  const clean2 = title2.toLowerCase().trim().replace(/[^\w\s]/g, '');

  if (clean1 === clean2) return true;

  // Check if one title contains the other (handles cases like "Short Title" vs "Short Title: Subtitle")
  if (clean1.includes(clean2) || clean2.includes(clean1)) {
    // Only if the longer title is not more than 2x the shorter one
    const ratio = Math.max(clean1.length, clean2.length) / Math.min(clean1.length, clean2.length);
    return ratio < 2;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    // 测试模式：使用固定用户ID
    const userId = 1; // 测试用户ID

    const body = await request.json();

    // Validate request body
    const validation = saveLiteratureSchema.safeParse(body);
    if (!validation.success) {
      console.error('Save literature validation failed:', validation.error.errors);
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const {
      title,
      authors,
      abstract,
      doi,
      publication_date,
      journal,
      citation_count = 0,
      source,
      keywords,
      pdf_url,
      notes,
    } = validation.data;

    // Check for duplicates by DOI
    if (doi) {
      const existingByDoi = await db
        .select()
        .from(literature)
        .where(eq(literature.doi, doi));

      if (existingByDoi.length > 0) {
        const existingLit = existingByDoi[0];

        // Check if user already has this literature
        const existingUserLit = await db
          .select()
          .from(userLiterature)
          .where(
            and(
              eq(userLiterature.user_id, userId),
              eq(userLiterature.literature_id, existingLit.id)
            )
          );

        if (existingUserLit.length > 0) {
          // Update notes if provided
          if (notes !== undefined) {
            await db
              .update(userLiterature)
              .set({ notes })
              .where(eq(userLiterature.id, existingUserLit[0].id));
          }

          return NextResponse.json({
            message: 'duplicate',
            duplicateType: 'doi',
            literature: {
              id: existingLit.id,
              title: existingLit.title,
              authors: JSON.parse(existingLit.authors),
              abstract: existingLit.abstract,
              doi: existingLit.doi,
              publication_date: existingLit.publication_date,
              journal: existingLit.journal,
              citation_count: existingLit.citation_count,
              source: existingLit.source,
              keywords: existingLit.keywords ? JSON.parse(existingLit.keywords) : null,
              pdf_url: existingLit.pdf_url,
              notes: notes !== undefined ? notes : existingUserLit[0].notes,
            },
          });
        }

        // Literature exists but user doesn't have it, add to user's library
        await db.insert(userLiterature).values({
          user_id: userId,
          literature_id: existingLit.id,
          notes: notes || null,
          created_at: new Date(),
        });

        apiCache.invalidate('/api/literature/library');

        return NextResponse.json({
          message: 'added_from_existing',
          duplicateType: 'doi',
          literature: {
            id: existingLit.id,
            title: existingLit.title,
            authors: JSON.parse(existingLit.authors),
            abstract: existingLit.abstract,
            doi: existingLit.doi,
            publication_date: existingLit.publication_date,
            journal: existingLit.journal,
            citation_count: existingLit.citation_count,
            source: existingLit.source,
            keywords: existingLit.keywords ? JSON.parse(existingLit.keywords) : null,
            pdf_url: existingLit.pdf_url,
            notes: notes || null,
          },
        });
      }
    }

    // Check for duplicates by title (for literature without DOI)
    const allLiterature = await db.select().from(literature);
    const duplicateByTitle = allLiterature.find(lit => areTitlesSimilar(lit.title, title));

    if (duplicateByTitle) {
      // Check if user already has this literature
      const existingUserLit = await db
        .select()
        .from(userLiterature)
        .where(
          and(
            eq(userLiterature.user_id, userId),
            eq(userLiterature.literature_id, duplicateByTitle.id)
          )
        );

      if (existingUserLit.length > 0) {
        return NextResponse.json({
          message: 'duplicate',
          duplicateType: 'title',
          similarTitle: duplicateByTitle.title,
          literature: {
            id: duplicateByTitle.id,
            title: duplicateByTitle.title,
            authors: JSON.parse(duplicateByTitle.authors),
            abstract: duplicateByTitle.abstract,
            doi: duplicateByTitle.doi,
            publication_date: duplicateByTitle.publication_date,
            journal: duplicateByTitle.journal,
            citation_count: duplicateByTitle.citation_count,
            source: duplicateByTitle.source,
            keywords: duplicateByTitle.keywords ? JSON.parse(duplicateByTitle.keywords) : null,
            pdf_url: duplicateByTitle.pdf_url,
            notes: existingUserLit[0].notes,
          },
        });
      }

      // Literature exists but user doesn't have it
      await db.insert(userLiterature).values({
        user_id: userId,
        literature_id: duplicateByTitle.id,
        notes: notes || null,
        created_at: new Date(),
      });

      apiCache.invalidate('/api/literature/library');

      return NextResponse.json({
        message: 'added_from_existing',
        duplicateType: 'title',
        similarTitle: duplicateByTitle.title,
        literature: {
          id: duplicateByTitle.id,
          title: duplicateByTitle.title,
          authors: JSON.parse(duplicateByTitle.authors),
          abstract: duplicateByTitle.abstract,
          doi: duplicateByTitle.doi,
          publication_date: duplicateByTitle.publication_date,
          journal: duplicateByTitle.journal,
          citation_count: duplicateByTitle.citation_count,
          source: duplicateByTitle.source,
          keywords: duplicateByTitle.keywords ? JSON.parse(duplicateByTitle.keywords) : null,
          pdf_url: duplicateByTitle.pdf_url,
          notes: notes || null,
        },
      });
    }

    // No duplicate found, create new literature entry
    const newLit = await db
      .insert(literature)
      .values({
        title,
        authors: JSON.stringify(authors),
        abstract: abstract || null,
        doi: doi || null,
        publication_date: publication_date || null,
        journal: journal || null,
        citation_count: citation_count,
        source,
        keywords: keywords ? JSON.stringify(keywords) : null,
        pdf_url: pdf_url || null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    const literatureId = newLit[0].id;

    // Create user_literature relationship
    await db.insert(userLiterature).values({
      user_id: userId,
      literature_id: literatureId,
      notes: notes || null,
      created_at: new Date(),
    });

    // Invalidate library cache
    apiCache.invalidate('/api/literature/library');

    return NextResponse.json(
      {
        message: 'Literature saved to library',
        literature: {
          id: newLit[0].id,
          title: newLit[0].title,
          authors: JSON.parse(newLit[0].authors),
          abstract: newLit[0].abstract,
          doi: newLit[0].doi,
          publication_date: newLit[0].publication_date,
          journal: newLit[0].journal,
          citation_count: newLit[0].citation_count,
          source: newLit[0].source,
          keywords: newLit[0].keywords ? JSON.parse(newLit[0].keywords) : null,
          pdf_url: newLit[0].pdf_url,
          notes: notes || null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Save literature error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
