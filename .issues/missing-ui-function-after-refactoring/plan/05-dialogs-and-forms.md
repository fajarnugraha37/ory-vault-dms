# Refactoring Plan: Dialogs & Forms

## Context
Dialogs currently lack proper validation, error handling, and use inline component definitions instead of the centralized design system.

## Step-by-Step Implementation

### Task 1: Fix `components/dashboard/dialogs/CreateFolderDialog.tsx`
**Goal:** Add validation and user feedback.
**Instructions:**
1. Open `components/dashboard/dialogs/CreateFolderDialog.tsx`.
2. *Action:* In the submit handler, if `!name.trim()`, do not just `return`. Call `toast.error("Folder name cannot be empty")` (using `sonner`).

### Task 2: Fix `components/dashboard/dialogs/RenameDialog.tsx`
**Goal:** Add validation.
**Instructions:**
1. Open `components/dashboard/dialogs/RenameDialog.tsx`.
2. *Action:* In the submit handler, if `!name.trim()`, call `toast.error("Name cannot be empty")` and return.

### Task 3: Fix `components/dashboard/dialogs/UploadDialog.tsx`
**Goal:** Improve file selection UX.
**Instructions:**
1. Open `components/dashboard/dialogs/UploadDialog.tsx`.
2. *Action:* Add an `accept` attribute to the `<input type="file" />` if the system only allows specific files. If all files are allowed, add a client-side size check before uploading:
   ```typescript
   const MAX_SIZE = 50 * 1024 * 1024; // 50MB example
   if (file.size > MAX_SIZE) {
       toast.error("File exceeds maximum allowed size.");
       return;
   }
   ```

### Task 4: Fix `components/dashboard/dialogs/MoveDialog.tsx`
**Goal:** Remove inline components and add validation.
**Instructions:**
1. Open `components/dashboard/dialogs/MoveDialog.tsx`.
2. *Action:* Remove any inline definitions of `cn` or `Label` inside this file. Import them properly from `@/lib/utils` and `@/components/ui/label`.
3. *Action:* Add basic validation for `targetParentId`. If it's not empty and not a valid UUID format, warn the user (unless the backend accepts non-UUID strings).

### Task 5: Fix `components/dashboard/dialogs/ShareDialog.tsx`
**Goal:** Safe browser API usage.
**Instructions:**
1. Open `components/dashboard/dialogs/ShareDialog.tsx`.
2. *Action:* When generating the public link using `window.location.origin`, ensure it is wrapped in a safety check:
   ```typescript
   const origin = typeof window !== 'undefined' ? window.location.origin : '';
   ```
