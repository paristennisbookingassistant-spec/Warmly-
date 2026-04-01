---
name: conventions
description: Coding conventions and patterns for the AI Networking Coach project. Load this skill when writing or reviewing code to ensure consistency.
---

# Coding Conventions

## API Route Pattern
Every API route follows this exact structure:

```typescript
// src/app/api/contacts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import type { ApiResponse, CreateContactRequest } from '@/types/api';

const createContactSchema = z.object({
  name: z.string().min(1),
  linkedin_url: z.string().url().optional(),
  current_role: z.object({
    title: z.string(),
    company: z.string(),
  }),
  source: z.enum(['manual_chat', 'manual_url', 'extension_bookmark', 'discovery']),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    // ... implementation
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /contacts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## AI Prompt Pattern
All AI prompts follow this structure:

```typescript
// src/lib/ai/scoring.ts
import Anthropic from '@anthropic-ai/sdk';
import { getModel } from './models';
import type { ScoringInput, ScoringOutput } from '@/types/ai';

const SCORING_SYSTEM_PROMPT = `You are a professional networking advisor...`;

export async function scoreContact(input: ScoringInput): Promise<ScoringOutput> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: getModel('scoring'), // Returns Haiku
    max_tokens: 1024,
    system: SCORING_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: buildScoringPrompt(input),
    }],
  });

  // Parse structured JSON from response
  const parsed = parseScoringResponse(response);
  return parsed;
}
```

## Component Pattern
React components follow this structure:

```tsx
// src/components/contacts/ContactCard.tsx
'use client'; // Only if needed for interactivity

import { type Contact } from '@/types/database';
import { cn } from '@/lib/utils';

interface ContactCardProps {
  contact: Contact;
  onOpenSession?: (contactId: string) => void;
}

export default function ContactCard({ contact, onOpenSession }: ContactCardProps) {
  return (
    <div className={cn(
      "rounded-lg border border-slate-200 bg-white p-4",
      "hover:shadow-md transition-all duration-200 cursor-pointer"
    )}>
      {/* Avatar + Name */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-sm font-medium text-blue-700">
            {contact.name.charAt(0)}
          </span>
        </div>
        <div>
          <h3 className="font-medium text-slate-900">{contact.name}</h3>
          <p className="text-sm text-slate-500">{contact.current_role} at {contact.company}</p>
        </div>
      </div>
      {/* Score + Stage */}
      {/* ... */}
    </div>
  );
}
```

## Naming Conventions
- Files: kebab-case for utilities (`rate-limiter.ts`), PascalCase for components (`ContactCard.tsx`)
- Variables/functions: camelCase (`scoreContact`, `profileSnapshot`)
- Types/interfaces: PascalCase (`Contact`, `ScoringOutput`)
- Constants: UPPER_SNAKE_CASE (`MAX_PROFILES_PER_SESSION`)
- Database columns: snake_case (`linkedin_url`, `created_at`)
- API routes: kebab-case (`/api/ai/score`, `/api/contacts`)

## Error Handling
- API routes: try/catch with typed error responses
- AI calls: retry once on timeout, return graceful fallback on failure
- Frontend: every data fetch has loading + error states
- Extension: log errors, continue processing (don't crash on one failed profile)

## Import Aliases
```typescript
// tsconfig.json paths
"@/*" → "src/*"
"@/types/*" → "src/types/*"
"@/lib/*" → "src/lib/*"
"@/components/*" → "src/components/*"
```
