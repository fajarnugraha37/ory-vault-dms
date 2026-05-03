# Refactoring Plan: Overview & Strategy

## Objective
The previous refactoring of the `dms-ui` resulted in missing features, broken UI/layouting, and lost behaviors. This plan provides a strict, step-by-step guide to restore and harden the application. 

## Target Audience
**IMPORTANT FOR THE IMPLEMENTING AI:** You are executing this plan. Do not skip steps. Do not assume context. Follow the instructions literally. If a file needs to be modified, read it first, apply the exact changes requested, and verify.

## Core Strategy
1. **Restore Visual Fidelity:** Bring back the "Linear/Modern" design system (animations, blobs, noise, shine effects) that were lost or hardcoded incorrectly.
2. **Fix Reactivity & State:** Replace native browser APIs (`window.location`) with Next.js App Router hooks (`usePathname`, `useRouter`) to fix broken client-side navigation.
3. **Harden Forms & Dialogs:** Add missing validations, error states (via `sonner` toasts), and type safety to all dialogs.
4. **Clean Up UI Components:** Remove inline component definitions and ensure all components use the centralized `ui/*` and `VaultPrimitives`.

## Potential Risks & Mitigations
*   **Risk:** CSS variable mismatches causing invisible elements (e.g., spotlight effect, sonner toasts).
    *   *Mitigation:* Step 1 explicitly defines all required CSS variables in `globals.css`.
*   **Risk:** Next.js Hydration errors due to `window` usage.
    *   *Mitigation:* Strict checks for `typeof window !== 'undefined'` and migration to Next.js hooks.
*   **Risk:** Type errors when fixing `NodeTable` actions.
    *   *Mitigation:* Explicitly define TypeScript unions for actions (`'rename' | 'move' | ...`).

## Execution Order
Please execute the plan in the following order:
1. `02-global-styles-and-theme.md`
2. `03-core-ui-components.md`
3. `04-dashboard-layout-and-context.md`
4. `05-dialogs-and-forms.md`
5. `06-data-table-and-actions.md`
