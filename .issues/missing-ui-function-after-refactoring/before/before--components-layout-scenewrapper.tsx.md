# Specification: components/layout/SceneWrapper.tsx

## Overview
A visual container component for vault pages that adds background animations and styling layers.

## Functionality
*   **User Interface:**
    *   Animated background blobs (accent, indigo, blue).
    *   Technical grid overlay.
    *   Base gradient layer.

## Behavior
*   Provides a persistent visual theme container for layout children.
*   Animated backgrounds using `framer-motion`.

## Logic & Data Handling
*   **State Management:**
    *   N/A (Presentational).

## Dependencies
*   `framer-motion`: Background animations.

## Potential Issues
*   Animation performance (large blur blobs + continuous motion) might impact rendering performance on lower-end hardware.
