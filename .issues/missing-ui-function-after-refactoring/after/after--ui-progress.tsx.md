# Specification: components/ui/progress.tsx

## Overview
A compositional Progress bar component built using `@base-ui/react/progress`.

## Functionality
*   **UI:** 
    *   Composed of `Progress` root, `ProgressTrack`, `ProgressIndicator`, `ProgressLabel`, and `ProgressValue`.
    *   Supports programmatic values (0-100).
*   **API:**
    *   Standard props from `ProgressPrimitive`.

## Behavior
*   Uses Base UI's primitives for progress bar management and accessibility.

## Dependencies
*   `@base-ui/react/progress`.
*   `lib/utils.ts`.

## Potential Issues
*   The track is hardcoded with `bg-muted` and `rounded-full`; styling customization needs to pass through `className` props.
