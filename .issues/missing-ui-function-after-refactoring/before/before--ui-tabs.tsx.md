# Specification: ui/tabs.tsx

## Overview
Tabs component using Base UI primitives.

## Functionality
*   **User Interface:**
    *   Container for tab controls (`TabsList`) and content (`TabsContent`).
    *   Trigger buttons for tab selection.
*   **Behavior:**
    *   Supports horizontal/vertical orientations.
    *   Variants: `default`, `line`.

## Logic & Data Handling
*   **State Management:**
    *   Managed by Base UI `TabsPrimitive`.

## Dependencies
*   `@base-ui/react/tabs`: Base primitives.
*   `class-variance-authority`: Style variants.
*   `lib/utils`: `cn` utility.
