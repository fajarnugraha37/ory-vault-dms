# Specification: app/globals.css

## Overview
Global CSS file defining custom Tailwind theme variables, base styles, and utility classes for the DMS UI.

## Functionality
*   **Theme:**
    *   Custom color palette (`background-deep`, `accent`, etc.) following a "Linear" aesthetic.
    *   Custom easing functions (`ease-expo-out`).
*   **Utilities:**
    *   `.bg-grid`: Technical grid background.
    *   `.bg-noise`: Noise texture overlay (using external image for optimization).
    *   `.text-gradient`: Applied to headings for a metallic finish.
    *   `.shadow-linear-card`: Custom shadow for vault cards.
*   **Animations:**
    *   `shine`: Keyframe for primary button highlight effect.

## Potential Issues
*   `.bg-noise::before` relies on an external image URL; if the service is down, background noise won't render.
*   Theme relies on CSS variables within `@theme`; ensure Tailwind configuration is modern (v4+).
