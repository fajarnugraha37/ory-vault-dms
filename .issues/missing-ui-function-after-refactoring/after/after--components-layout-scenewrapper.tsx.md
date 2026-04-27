# Specification: components/layout/SceneWrapper.tsx

## Overview
A visual container wrapper that adds atmospheric effects, backgrounds, and animations (blobs) to application scenes.

## Functionality
*   **Visuals:**
    *   Radial base gradient.
    *   Animated floating blobs (using `framer-motion`).
    *   Technical grid overlay.
*   **Layout:**
    *   `relative` positioning, `min-h-screen`, `overflow-hidden`.

## Behavior
*   Displays animated blobs with varied durations, delays, and paths for aesthetic "life."
*   Wraps children in a relative container with a higher z-index (`z-10`).

## Dependencies
*   `framer-motion`.

## Potential Issues
*   The heavy use of `framer-motion` animations and blur filters might impact performance on low-end hardware if the browser GPU acceleration is limited.
*   The `bg-noise` class implies a global CSS dependency which must be present in `globals.css` or equivalent.
*   Blobs are explicitly positioned using hardcoded values; this might break or look odd on very wide/tall screens.
