# Refactoring Plan: Core UI Components

## Context
The shared primitives and base UI components need to be aligned with the design system and stripped of hardcoded anti-patterns.

## Step-by-Step Implementation

### Task 1: Fix `components/shared/VaultPrimitives.tsx`
**Goal:** Ensure `VaultCard` and `VaultButton` function correctly without performance hits.
**Instructions:**
1. Open `components/shared/VaultPrimitives.tsx`.
2. **VaultCard:** The `onMouseMove` spotlight effect is currently applied to every card. 
   - *Action:* Wrap the `handleMouseMove` function in a `useCallback` to prevent unnecessary re-renders.
   - *Action:* Ensure the radial gradient uses the `--x` and `--y` CSS variables correctly in the `style` prop.
3. **VaultButton:** 
   - *Action:* Ensure the `primary` variant includes the `animate-shine` class (defined in `globals.css`).

### Task 2: Fix `components/ui/progress.tsx`
**Goal:** Allow custom styling for the progress track.
**Instructions:**
1. Open `components/ui/progress.tsx`.
2. Locate `ProgressTrack`. It currently has hardcoded `bg-muted`.
3. *Action:* Ensure `className` passed to `ProgressTrack` is merged using `cn()` so parent components can override the background color (e.g., `cn("bg-muted rounded-full", className)`).

### Task 3: Fix `components/ui/sonner.tsx`
**Goal:** Ensure theme compatibility.
**Instructions:**
1. Open `components/ui/sonner.tsx`.
2. *Action:* Verify that `useTheme()` from `next-themes` is imported and used correctly to set the `theme` prop on the `<Toaster />`.
3. *Action:* Ensure the `toastOptions.classNames` map correctly to the CSS variables defined in `globals.css` (Task 1 of the Global Styles plan).
