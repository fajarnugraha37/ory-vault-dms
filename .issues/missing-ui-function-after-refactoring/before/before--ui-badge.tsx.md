# Specification: ui/badge.tsx

## Overview
Generic UI Badge component using `class-variance-authority`.

## Functionality
*   **User Interface:** 
    *   Small labels with variant-based styles (default, secondary, destructive, outline, ghost, link).

## Logic & Data Handling
*   **State Management:**
    *   Variant-driven styles via `cva`.

## Dependencies
*   `class-variance-authority`: Style variant management.
*   `lib/utils`: `cn` utility.
*   `@base-ui/react`: UI rendering core.
