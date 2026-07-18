---
name: migrate-client-page-mutations-to-server-page-and-functions
description: Migrate a Next.js page from client-side fetch() mutations (create/edit/delete calls with manual useState syncing) to React Server Functions (the App Router's mutation pattern, commonly invoked as Server Actions) using revalidatePath, revalidateTag, updateTag, or refresh from next/cache. Use this whenever the user wants to refactor a list, table, or detail page so that edits/deletes/creates update the UI without manually reconciling client state after a fetch call, or when they mention "server actions", "server functions", "revalidatePath", "revalidateTag", "updateTag", or ask how to show fresh data after a mutation in a Next.js App Router app. Written for Next.js 16+ terminology and cache APIs.
---

# Next.js: Client Fetch → Server Functions Migration

Migrates a Next.js App Router page from the "Server Component fetches
initial data, Client Component does fetch() for mutations and manually
syncs local state" pattern to the current recommended pattern: define
**Server Functions** for mutations and let Next.js's cache APIs
(`revalidatePath`, `revalidateTag`, `updateTag`, `refresh`) tell the
framework to re-render with fresh data — instead of the client
hand-reconciling its own copy of server state.

## Terminology (this changed — don't get it backwards)

- **Server Function** is the general term: any async function marked
  `"use server"` that runs on the server and can be called from the
  client.
- **Server Action** is a Server Function used specifically for a
  mutation — i.e. passed to a `<form action={...}>`, a `<button
  formAction={...}>`, or invoked from `startTransition`. Every Server
  Action is a Server Function; not every Server Function is a Server
  Action (some are just server-side reads/callables).
- **This is not a deprecation.** "Server Actions" isn't legacy — it's
  the specific name for the mutation-shaped subset of Server Functions.
  Code written against the "Server Actions" mental model still applies;
  only the vocabulary got more precise (as of the Next.js docs' rename
  around late 2024, current through Next.js 16).

In practice: write `"use server"` functions as before. Call them
Server Actions when talking about the ones wired to forms/mutations.

## When this migration applies

Look for a page shaped like this:

- A Server Component (`page.tsx`) does the initial data fetch and passes
  it as props (often named `initial*`) to a Client Component.
- The Client Component copies those props into `useState` and does its
  own `fetch()` calls for create/edit/delete, then manually mutates that
  local state on success (`.filter()`, `.map()`, spreading updated
  fields, etc.) to make the UI reflect the change.

This manual reconciliation is the smell to fix — it duplicates the
server's logic on the client (computing totals, defaulting nulls,
merging partial updates) and can drift out of sync with what the server
actually persisted.

## Migration steps

### 1. Identify the mutations and their current fetch calls

For each mutation (create/edit/delete), note:
- HTTP method + endpoint
- request body shape
- how auth is currently attached (cookies, headers, tokens)
- how the client currently updates local state on success — this tells
  you what needs to be fresh after the Server Function runs
- whether the underlying data is read via a tagged `fetch`/`"use
  cache"` function (matters for choosing which cache API to call)

### 2. Create a Server Functions file

Co-locate it with the page, e.g. `app/<route>/actions.ts`, with
`"use server"` as the first line. One exported async function per
mutation — these are your Server Actions.

```ts
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function deleteThing(id: string) {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${API_BASE}/things/${id}`, {
    method: "DELETE",
    headers: { Cookie: cookieHeader },
  });
  if (!res.ok) return { ok: false, error: "Couldn't delete that item." };
  revalidatePath("/things"); // match the route that renders the list
  return { ok: true };
}
```

Rules of thumb:
- **Return a result object, don't throw.** `{ ok: true }` or
  `{ ok: false, error: string }`. This lets the client show existing
  error UI without a try/catch changing shape.
- **Reuse whatever auth mechanism the page.tsx already uses** for its
  server-side fetch (cookie forwarding, auth headers, etc.) — don't
  invent a new one. Server Functions are reachable via direct POST
  requests from outside your UI, so re-verify auth/ownership inside the
  function itself; never rely on the client only calling it from the
  "right" place.
- **Call the cache API only on success**, after the mutation is
  confirmed, not before.

### 3. Choose the right cache API

Next.js 16 gives you four tools; they're not interchangeable —
pick based on what the user needs to see and how the source data is
cached.

| API | Where callable | Effect | Use when |
|---|---|---|---|
| `revalidatePath(path)` | Server Functions | Marks a route's cache stale; re-renders on next visit | Simplest default — the mutated data isn't `"use cache"`-tagged, or you don't need to be precise about which cache entries clear |
| `revalidateTag(tag, profile)` | Anywhere | Invalidates cache entries with that tag; may briefly serve stale data during background revalidation | Data is fetched with a `cacheTag`/`cacheLife` and shared across multiple routes. **Next.js 16: the second `cacheLife` profile argument is required** — the old single-argument form is deprecated |
| `updateTag(tag)` | Server Functions only | Expires tagged cache **and** refreshes it in the same request (read-your-writes) | User needs to see their own change immediately after submitting (e.g. their own settings, their own new item in a list) |
| `refresh()` | Server Functions only | Refreshes the client router's uncached/dynamic data only — doesn't touch tag-based cache | Cheapest option when the list itself isn't `"use cache"`-tagged and you just need the Server Component to re-run |

```ts
"use server";
import { revalidateTag } from "next/cache";

export async function createPost(formData: FormData) {
  // ...mutate...
  revalidateTag("posts", "max"); // profile argument required in Next.js 16
}
```

```ts
"use server";
import { updateTag } from "next/cache";

export async function updateUserProfile(userId: string, profile: Profile) {
  await db.users.update(userId, profile);
  updateTag(`user-${userId}`); // caller sees their own edit instantly
}
```

```ts
"use server";
import { refresh } from "next/cache";

export async function markNotificationRead(id: string) {
  await db.notifications.markAsRead(id);
  refresh(); // router refresh, no cache tags involved
}
```

If unsure, start with `revalidatePath` — it's the least surprising
default and matches most "list refreshes after edit/delete" cases.
Reach for `updateTag`/`refresh` only once you've confirmed the data is
actually cached with `"use cache"` and staleness is visibly a problem.

### 4. Update the Client Component to call the Server Function

Replace each `fetch()` call with a call to the imported Server
Function.

```tsx
import { useTransition } from "react";
import { deleteThing } from "./actions";

const [isPending, startTransition] = useTransition();
const [error, setError] = useState("");

function handleDelete(id: string) {
  startTransition(async () => {
    const result = await deleteThing(id);
    if (!result.ok) setError(result.error);
  });
}
```

Key change: **delete the manual state-sync logic.** No more
`setItems((current) => current.filter(...))` or hand-built merge
objects. Once the cache API call lands, Next.js marks the route stale
and the Server Component re-runs on the next render, passing fresh
`initial*` props down. The client only needs to manage its own
transient UI state (closing a modal, clearing a form, disabled/pending
states).

For simple cases prefer passing the Server Function straight to a form:

```tsx
<form action={deleteThing.bind(null, item.id)}>
  <button type="submit">Delete</button>
</form>
```

This gets progressive enhancement (works before JS hydrates) for free.
Use the `useTransition` + event-handler version instead when you need
custom pending UI, confirm dialogs, or non-form triggers.

### 5. Decide if optimistic UI is worth adding

Skip this on the first pass. If the user later wants instant feedback
before the server confirms (large lists, slow networks, delete/reorder
operations), add `useOptimistic` around the existing Server Function
call rather than reintroducing manual state syncing:

```tsx
const [optimisticItems, removeOptimistic] = useOptimistic(
  items,
  (state, id: string) => state.filter((item) => item.id !== id),
);
```

## What "done" looks like

- No `fetch()` calls remain in the Client Component for mutations —
  only Server Function imports and calls.
- No manual `.filter()`/`.map()`/spread reconciliation of list state
  after a mutation succeeds.
- Every mutating Server Function validates auth/ownership itself, calls
  the appropriate cache API (`revalidatePath` by default;
  `revalidateTag`/`updateTag`/`refresh` when justified) on success, and
  returns a typed `{ ok, error? }` result instead of throwing.
- Existing error messages, confirm dialogs, and loading/disabled states
  in the UI are preserved — the refactor changes *how* data flows, not
  the user-facing behavior.

## Common pitfalls

- **Confusing "Server Action" with a deprecated concept.** It isn't
  deprecated — it's the mutation-shaped subset of Server Functions.
  Don't let a refactor rename working `"use server"` mutation code
  just because "Server Function" sounds newer.
- **Using the old single-argument `revalidateTag(tag)`.** Next.js 16
  requires a `cacheLife` profile as the second argument.
- **Calling `updateTag`/`refresh` from a Route Handler or Client
  Component.** Both are Server-Function-only; they throw outside that
  context.
- **Revalidating the wrong path/tag.** It must match what the Server
  Component doing the original read actually uses, not the API
  endpoint URL.
- **Forgetting auth forwarding.** Server Functions run on the server
  but don't automatically inherit the browser's cookies the way a
  same-origin client fetch does — forward them explicitly via
  `cookies()` from `next/headers`, matching whatever the page already
  does for its initial fetch. Also re-check authorization inside the
  function itself, since Server Functions are POST-reachable directly,
  not just through your UI.
- **Throwing instead of returning errors.** An uncaught throw in a
  Server Function surfaces as a generic Next.js error boundary, not the
  app's existing inline error UI — return a result object instead.
- **Keeping dead state.** After migrating, `useState` that only existed
  to mirror server data (e.g. `items` copied from `initialItems`) is
  usually no longer needed — the component can often just use the
  `initial*` prop directly, unless there's a real reason to keep local
  copies (e.g. optimistic updates).