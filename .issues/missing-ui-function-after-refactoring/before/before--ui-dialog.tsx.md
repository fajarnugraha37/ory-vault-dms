# Specification: ui/dialog.tsx

## Overview
Dialog wrapper components using Radix UI primitives.

## Functionality
*   **User Interface:**
    *   Modal dialog structure (Content, Header, Footer, Title, Description, Overlay).
    *   Includes close button.

## Logic & Data Handling
*   **State Management:**
    *   Controlled by Radix UI `DialogPrimitive`.

## Dependencies
*   `@radix-ui/react-dialog`: Base primitives.
*   `lucide-react`: Close icon.
*   `lib/utils`: `cn` utility.
