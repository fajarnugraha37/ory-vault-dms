# Refactoring Plan: Global Styles & Theme

## Context
The design system relies heavily on specific CSS animations (`shine`), background textures (`bg-noise`), and CSS variables for theming (especially for `sonner` toasts). These were lost or misconfigured during the refactoring.

## Step-by-Step Implementation

### Task 1: Update `app/globals.css`
**Goal:** Restore missing animations and CSS variables.
**Instructions:**
1. Open `app/globals.css`.
2. Ensure the following CSS variables are defined in the `:root` or `.dark` scope (since the app is forced dark mode):
   ```css
   :root {
     /* Sonner Toast Variables */
     --normal-bg: #050506;
     --normal-border: rgba(255, 255, 255, 0.1);
     --normal-text: #EDEDEF;
     --success-bg: rgba(16, 185, 129, 0.1);
     --success-border: rgba(16, 185, 129, 0.2);
     --success-text: #10B981;
     --error-bg: rgba(239, 68, 68, 0.1);
     --error-border: rgba(239, 68, 68, 0.2);
     --error-text: #EF4444;
     /* Add warning/info if needed */
   }
   ```
3. Add the `shine` keyframe animation:
   ```css
   @keyframes shine {
     from { background-position: 200% center; }
     to { background-position: -200% center; }
   }
   .animate-shine {
     animation: shine 8s ease-in-out infinite;
   }
   ```
4. Add the `bg-noise` utility class:
   ```css
   .bg-noise {
     background-image: url('/noise.svg'); /* Ensure this asset exists in public/ */
     background-repeat: repeat;
     opacity: 0.015;
   }
   ```

### Task 2: Fix `components/layout/SceneWrapper.tsx`
**Goal:** Make background blobs responsive and ensure `bg-noise` works.
**Instructions:**
1. Open `components/layout/SceneWrapper.tsx`.
2. Locate the hardcoded pixel values for the blobs (e.g., `w-[900px] h-[1400px]`).
3. Change them to responsive values (e.g., `w-[150vw] md:w-[900px] h-[150vh] md:h-[1400px]`) so they don't break on mobile or ultra-wide screens.
4. Verify that the `bg-noise` class is applied to a full-screen absolute div.

### Task 3: Verify `tailwind.config.ts`
**Goal:** Ensure `data-slot` and `group-data` are supported.
**Instructions:**
1. Open `tailwind.config.ts`.
2. Ensure there are no conflicting plugins that strip `data-*` attributes, as the new `ui/*` components rely heavily on them (e.g., `data-[slot=title]`).
