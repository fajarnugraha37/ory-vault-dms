# Iteration 0008a: Technical Aesthetic Overhaul (Linear Style)

## Status: PLANNED 🚀
**Target Version:** v0.2.0-alpha

## Goal
Transform the ORY-VAULT UI from "Neo-Brutalist" to a high-fidelity "Linear/Modern" aesthetic, focusing on interactive depth, layered ambient lighting, and precision micro-interactions as defined in `DESIGN_SYSTEM.md`.

## Core Technical Stack
- **Animation**: `framer-motion` (for physics-based smoothing and scene orchestration).
- **Styling**: Tailwind CSS v4 (with custom tokens).
- **State**: React Context (VaultProvider).
- **Noise**: Inline SVG feTurbulence Filters.

## Implementation Roadmap

### Phase 1: Foundation & Tokens
- [ ] **Dependency Update**: Install `framer-motion`.
- [ ] **Tailwind Config**:
    - [ ] Define `background-deep (#020203)`, `background-base (#050506)`, `accent (#5E6AD2)`.
    - [ ] Add custom `expo-out` easing (`cubic-bezier(0.16, 1, 0.3, 1)`).
- [ ] **Global CSS**:
    - [ ] Implement procedural SVG noise filter in root layout.
    - [ ] Set "Inter" / "Geist Sans" as the primary font stack with `#EDEDEF` text color.

### Phase 2: Atmospheric Engine
- [ ] **SceneWrapper Component**:
    - [ ] Create a container that manages the 4-layer background system.
    - [ ] Implement **Layer 1**: Deep radial base gradient.
    - [ ] Implement **Layer 3**: Three animated floating blobs using `framer-motion` (Scene-specific positioning).
    - [ ] Implement **Layer 4**: 64px technical grid overlay (2% opacity).

### Phase 3: High-Fidelity Primitives
- [ ] **VaultCard v2**:
    - [ ] Hairline borders (`border-white/[0.06]`) and `rounded-2xl`.
    - [ ] **Mouse-Tracking Spotlight**: Implement `useMotionValue` tracking for the 300px radial glow.
    - [ ] Multi-layer shadows: border highlight + diffuse ambient shadow.
- [ ] **VaultButton v2**:
    - [ ] Top-edge inner highlight.
    - [ ] Subtle shine/gradient-sweep effect on hover.
    - [ ] Subtle scale interaction (`scale-[0.98]`).

### Phase 4: System Integration
- [ ] **Navigation**: Refactor Navbar to `backdrop-blur-xl` glassmorphism with technical precision (1px bottom border).
- [ ] **Auth Node**: Implement "Verification Protocol" cinematic intro for Login/Registration.
- [ ] **Vault Node**: Staggered entrance animations for document/folder lists.

## Verification Checklist
- [ ] **Performance**: 60fps animations on 4K viewports (Hardware acceleration check).
- [ ] **A11y**: Ensure all text meets the 15:1 contrast ratio standard.
- [ ] **Consistency**: No remaining "Neo-Brutalist" elements (harsh shadows, high-saturated yellows/pinks).

## Issue Prevention (Lessons Learned)
- **CSS Variable Collisions**: Use unique prefixing for spotlight coordinates (`--vault-spotlight-x`).
- **Blur Performance**: Use `will-change: transform, filter` for large animated blobs.
