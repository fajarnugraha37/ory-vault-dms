# Refactoring Implementation Checklist

This checklist serves as a final verification tool for the implementing AI to ensure all steps from the refactoring plan have been executed correctly.

## Phase 1: Global Styles & Theme (`02-global-styles-and-theme.md`)
- [ ] `app/globals.css`: Added Sonner Toast CSS variables (`--normal-bg`, `--success-bg`, etc.) to `:root` or `.dark`.
- [ ] `app/globals.css`: Added `@keyframes shine` and `.animate-shine` utility class.
- [ ] `app/globals.css`: Added `.bg-noise` utility class with correct background image and opacity.
- [ ] `components/layout/SceneWrapper.tsx`: Updated hardcoded blob dimensions to responsive values (e.g., `w-[150vw] md:w-[900px]`).
- [ ] `components/layout/SceneWrapper.tsx`: Verified `.bg-noise` is applied to a full-screen absolute div.
- [ ] `tailwind.config.ts`: Verified no plugins strip `data-*` attributes (like `data-slot`).

## Phase 2: Core UI Components (`03-core-ui-components.md`)
- [ ] `components/shared/VaultPrimitives.tsx` (`VaultCard`): Wrapped `handleMouseMove` in `useCallback`.
- [ ] `components/shared/VaultPrimitives.tsx` (`VaultCard`): Verified radial gradient uses `--x` and `--y` CSS variables correctly.
- [ ] `components/shared/VaultPrimitives.tsx` (`VaultButton`): Ensured `primary` variant includes the `animate-shine` class.
- [ ] `components/ui/progress.tsx`: Updated `ProgressTrack` to merge `className` using `cn()` (e.g., `cn("bg-muted rounded-full", className)`).
- [ ] `components/ui/sonner.tsx`: Verified `useTheme()` from `next-themes` is used to set the `theme` prop on `<Toaster />`.
- [ ] `components/ui/sonner.tsx`: Ensured `toastOptions.classNames` map to the CSS variables defined in `globals.css`.

## Phase 3: Dashboard Layout & Context (`04-dashboard-layout-and-context.md`)
- [ ] `context/VaultContext.tsx`: Replaced `window.location.pathname` with `usePathname()` from `next/navigation`.
- [ ] `context/VaultContext.tsx`: Ensured the `offset` reset `useEffect` does not cause double-fetching (data flashing).
- [ ] `lib/api.ts`: Updated 401 interceptor to use `router.push('/auth/login')` or wrapped `window.location.href` in `typeof window !== 'undefined'`.
- [ ] `lib/ory.ts`: Replaced hardcoded `https://auth.ory-vault.test` with `process.env.NEXT_PUBLIC_ORY_URL || "https://auth.ory-vault.test"`.
- [ ] `components/layout/Navbar.tsx`: Added loading state handling for the "Identity" link to prevent UI jumping while `me` is fetching.

## Phase 4: Dialogs & Forms (`05-dialogs-and-forms.md`)
- [ ] `components/dashboard/dialogs/CreateFolderDialog.tsx`: Added validation to show `toast.error("Folder name cannot be empty")` if name is empty.
- [ ] `components/dashboard/dialogs/RenameDialog.tsx`: Added validation to show `toast.error("Name cannot be empty")` if name is empty.
- [ ] `components/dashboard/dialogs/UploadDialog.tsx`: Added `accept` attribute or client-side file size validation (e.g., 50MB limit) with `toast.error`.
- [ ] `components/dashboard/dialogs/MoveDialog.tsx`: Removed inline `cn` or `Label` definitions; imported them properly.
- [ ] `components/dashboard/dialogs/MoveDialog.tsx`: Added basic validation for `targetParentId` (e.g., UUID format check or empty check).
- [ ] `components/dashboard/dialogs/ShareDialog.tsx`: Wrapped `window.location.origin` in `typeof window !== 'undefined'` check.

## Phase 5: Data Table & Actions (`06-data-table-and-actions.md`)
- [ ] `components/dashboard/NodeTable.tsx`: Defined strict TypeScript union `NodeActionType` (`'rename' | 'move' | 'share' | 'delete' | 'download'`).
- [ ] `components/dashboard/NodeTable.tsx`: Updated `onAction` prop signature to use `NodeActionType`.
- [ ] `components/dashboard/NodeTable.tsx`: Updated all `onClick` handlers in `DropdownMenu` to use the strict types.
- [ ] `types/index.ts` (or equivalent): Verified `Node` interface matches backend structure (`id`, `name`, `type`, `size`, `updated_at`).
- [ ] Parent Page (e.g., `app/dashboard/documents/page.tsx`): Verified `handleNodeAction` uses a `switch` statement covering all `NodeActionType` cases.

## Final Verification
- [ ] Run `npm run build` or `yarn build` to ensure no TypeScript or Next.js build errors.
- [ ] Test client-side navigation between dashboard pages (no full page reloads).
- [ ] Verify all dialogs open, validate input, and close correctly.
- [ ] Verify the spotlight effect on cards and shine effect on primary buttons are visible.
