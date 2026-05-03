# Refactoring Plan: Data Table & Actions

## Context
The `NodeTable` component is the core of the dashboard but suffers from type safety issues and potential runtime errors due to string-based action handlers.

## Step-by-Step Implementation

### Task 1: Fix `components/dashboard/NodeTable.tsx` Type Safety
**Goal:** Prevent typos in action handlers.
**Instructions:**
1. Open `components/dashboard/NodeTable.tsx`.
2. *Action:* Define a strict TypeScript union for actions:
   ```typescript
   export type NodeActionType = 'rename' | 'move' | 'share' | 'delete' | 'download';
   ```
3. *Action:* Update the `onAction` prop signature to use this type:
   ```typescript
   onAction: (action: NodeActionType, node: Node) => void;
   ```
4. *Action:* Update all `onClick` handlers in the `DropdownMenu` to use these strict types instead of raw strings.

### Task 2: Verify `Node` Interface
**Goal:** Ensure data alignment with the backend.
**Instructions:**
1. In `NodeTable.tsx` (or wherever the `Node` type is defined globally, e.g., `types/index.ts`), ensure the interface matches the backend `app.nodes` and `app.file_metadata` structure exactly.
   ```typescript
   interface Node {
     id: string;
     name: string;
     type: 'FILE' | 'FOLDER';
     size?: number;
     updated_at: string;
     // add other fields as necessary
   }
   ```

### Task 3: Parent Component Action Handling
**Goal:** Ensure the parent component actually implements the logic.
**Instructions:**
1. *Action:* Instruct the AI to check the parent page (e.g., `app/dashboard/documents/page.tsx`).
2. *Action:* Ensure the `handleNodeAction` function in the parent page has a `switch` statement that covers ALL cases of `NodeActionType` and opens the corresponding dialogs or triggers the download API.
