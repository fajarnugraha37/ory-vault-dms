# Refactoring Plan: Dashboard Layout & Context

## Context
The application state and routing rely on native browser APIs (`window.location`) which breaks Next.js client-side routing (SPA feel) and causes full page reloads or hydration errors.

## Step-by-Step Implementation

### Task 1: Fix `context/VaultContext.tsx`
**Goal:** Make routing reactive and prevent data flashing.
**Instructions:**
1. Open `context/VaultContext.tsx`.
2. *Action:* Replace `window.location.pathname` with `usePathname()` from `next/navigation`.
   ```typescript
   import { usePathname } from 'next/navigation';
   // inside component:
   const pathname = usePathname();
   const isTrash = pathname === '/dashboard/trash';
   ```
3. *Action:* In the `useEffect` that resets `offset` to 0 when dependencies change, ensure it does not cause a double-fetch (data flashing). Use a ref to track initial mount if necessary.

### Task 2: Fix `lib/api.ts`
**Goal:** Fix the 401 Unauthorized redirect.
**Instructions:**
1. Open `lib/api.ts`.
2. Locate the Axios response interceptor handling `401`.
3. *Action:* Currently it uses `window.location.href = '/auth/login'`. While this works, it forces a hard reload. If possible, export a utility or use a global event to trigger a `router.push('/auth/login')`. If keeping `window.location.href`, wrap it in a `typeof window !== 'undefined'` check to prevent SSR crashes.

### Task 3: Fix `lib/ory.ts`
**Goal:** Remove hardcoded environment URLs.
**Instructions:**
1. Open `lib/ory.ts`.
2. *Action:* Replace `https://auth.ory-vault.test` with an environment variable fallback.
   ```typescript
   const basePath = process.env.NEXT_PUBLIC_ORY_URL || "https://auth.ory-vault.test";
   ```

### Task 4: Fix `components/layout/Navbar.tsx`
**Goal:** Robust role checking.
**Instructions:**
1. Open `components/layout/Navbar.tsx`.
2. *Action:* The "Identity" link depends on `me.role === 'admin'`. Ensure that while `me` is loading (`isLoading`), the UI does not jump (e.g., reserve space or show a skeleton).
