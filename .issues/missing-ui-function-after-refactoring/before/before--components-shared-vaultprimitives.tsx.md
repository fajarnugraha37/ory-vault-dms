# Specification: components/shared/VaultPrimitives.tsx

## Overview
Shared UI library components (`VaultCard`, `VaultButton`, `VaultHeader`, `VaultBadge`) used throughout the vault dashboard.

## Functionality
*   **VaultCard:** Container with optional spotlight effect (radial gradient following mouse).
*   **VaultButton:** Custom styled button with variants (primary, secondary, ghost, destructive) and loading state.
*   **VaultHeader:** Page header with animated text.
*   **VaultBadge:** Styled badge for labels.

## Behavior
*   `VaultCard` tracks mouse movement for CSS variable spotlighting.
*   `VaultButton` includes shine effect for primary variant.
*   `VaultHeader` uses `framer-motion` for reveal animation.

## Dependencies
*   `framer-motion`: Animations.
*   `lib/utils`: `cn` utility.
*   `lucide-react`: Icons.

## Potential Issues
*   The `onMouseMove` event in `VaultCard` runs on every move, which *should* be performant but could be heavy if many cards are on screen.
*   Spotlight effect relies on `--x` and `--y` CSS variables; if CSS isn't correctly applied or shadowed, it breaks.
