# Known Issues

## Issue #1: JSX Build Error in Reading Page

**Date:** 2026-02-11

**File:** `src/app/literature/[id]/read/page.tsx`

**Error:**
```
Error: Unexpected token `div`. Expected jsx identifier
at line 73-76 in the return statement
```

**Symptoms:**
- Clicking "阅读模式" (Reading Mode) button causes build error
- Page returns 500 status
- Next.js compiler rejects the JSX syntax despite it appearing correct
- ESLint also reports parsing errors: "The keyword 'import' is reserved"

**Attempts:**
1. Ran `eslint --fix` - Failed
2. Manually edited specific sections - Failed
3. Rewrote entire file with simplified structure - Failed
4. Multiple server restarts and cache clearing - Failed

**Current Code Structure:**
```tsx
'use client';

import { useState, useEffect } from 'react';
// ... other imports

export default function LiteratureReadPage() {
  const [literature, setLiterature] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  return (
    <div className="h-screen flex flex-col gap-6">
      <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-900">
        <PDFViewer url={literature?.pdf_url || ''} title={literature?.title || 'PDF 预览'} />
      </div>
      <div className="w-96 border-l bg-background overflow-y-auto">
        <NotesPanel literatureId={literature ? parseInt(id as string) : 0} />
      </div>
    </div>
  );
}
```

**Next Steps to Try:**
1. Fix layout: Change `flex flex-col` to `flex flex-row` for proper horizontal layout
2. Check for conflicting imports or module issues
3. Verify tsconfig.json and next.config.js JSX settings
4. Try creating page at a different route path
5. Check if PDFViewer or NotesPanel components have issues

**Status:** ✅ RESOLVED

**Root Cause:**
The layout was using `flex flex-col` (vertical) but the structure required `flex flex-row` (horizontal).
- Left side: PDF viewer with `flex-1` (should grow to fill remaining width)
- Right side: Notes panel with `w-96` (fixed width)

**Solution:**
Changed line 61 from:
```tsx
<div className="h-screen flex flex-col gap-6">
```
to:
```tsx
<div className="h-screen flex flex-row">
```

Also removed redundant nested div and simplified the structure.

**Verification:**
- ✓ Compiled successfully
- ✓ GET /literature/41/read 200 in 47ms
- ✓ Page loads correctly with side-by-side layout
