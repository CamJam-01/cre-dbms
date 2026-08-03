# Vantage CRE Design System

Status: Source of truth for the website and authenticated application redesign

Last updated: 2026-08-01

## Purpose

Vantage CRE is a commercial real estate database management system for organizing, searching, and managing land-sale comparables. This document defines the visual language, interaction principles, content direction, and implementation constraints for the redesign.

The companion template in `lib/design/design-template.html` is the visual reference. Its product copy, logos, testimonials, pricing, contact details, and status claims are placeholders and must not be copied into Vantage CRE without validation.

## Design direction

Create a premium dark-mode CRE data workspace with the visual character of an institutional research terminal:

- Dark graphite foundation
- Warm orange/amber signal color
- Editorial serif headlines paired with a technical monospace UI font
- Thin borders, framed panels, subtle grids, and compact metadata labels
- Dense but structured information presentation
- Motion that reveals relationships or state rather than adding decoration

The experience should feel trusted, precise, data-forward, professional, and calm under complexity.

## Color system

| Role | Token | Usage |
| --- | --- | --- |
| Page background | `#030303` | Global canvas |
| Panel background | `#070707` / `#0B0B0B` | Cards, frames, navigation |
| Warm panel | `#120B07` / `#4D2915` | Featured or active panels |
| Primary accent | `#FF6400` | Primary actions and active states |
| Highlight accent | `#FFA500` | Focus, data emphasis, status indicators |
| Primary text | `#FFFFFF` | Headings and high-priority content |
| Secondary text | Zinc gray range | Supporting copy and metadata |
| Border | White at 8–12% opacity | Structure and separation |

Orange should indicate action, focus, active states, or important data—not every visual element.

## Typography

- Display headings: Newsreader or a comparable editorial serif.
- UI labels, navigation, metadata, and table headers: JetBrains Mono.
- Body copy: Newsreader or a readable sans-serif fallback.
- Headings use tight tracking, strong contrast, and short line lengths.
- Metadata labels are small, uppercase, monospace, and letter-spaced.

## Layout language

- Maximum content width: approximately 1180–1200px.
- Major sections use framed panels with 12–16px radii and thin translucent borders.
- Use small corner-mark details on important frames.
- Prefer grid-based layouts with intentional asymmetry.
- Use generous section spacing and compact internal spacing for data-dense areas.
- Use bento layouts for dashboard metrics, recent activity, saved searches, and data-quality indicators.

## Public website structure

The public homepage should introduce Vantage CRE as a focused CRE intelligence workspace:

1. Hero: “Commercial real estate data, organized for better decisions.”
2. Product preview: a realistic Comp Data interface with records, metrics, and filters.
3. Value pillars: centralized comps, faster underwriting workflows, searchable transaction history, and expandable market intelligence.
4. Workflow story: capture, normalize, analyze, and export.
5. Proof and trust: only real capabilities, customers, and claims.
6. Authentication CTA: sign in or create an account.

Do not port irrelevant template content such as fabricated logos, testimonials, pricing, API claims, or unsupported system-status claims.

## Authenticated application structure

### Dashboard

Use a framed dashboard shell with:

- Total sales records
- Recent sales volume
- Median sale price
- Median price per acre
- Recently updated records
- Quick links to Comp Data and user management
- Data-quality or import status where supported by real data

### Comp Data

- Strong bordered table frame
- Monospace column labels
- Orange active filter and sort states
- Sticky table header
- Intentional horizontal scrolling on small screens
- Clear loading, empty, success, and error states
- Comfortable/compact density preference retained

## Shared component language

Build reusable local styles and components for:

- Framed panels
- Corner marks
- Primary and secondary buttons
- Metadata labels
- Status badges
- Dark form fields
- Metric cards
- Empty and error states
- Responsive navigation

## Motion

Use motion selectively for section reveals, subtle panel elevation, button feedback, and filter/table state transitions. Any animated hero background is optional.

All motion must:

- Respect `prefers-reduced-motion`.
- Never block table interaction.
- Avoid excessive motion in data-dense screens.
- Preserve fast initial load.

The template uses Lenis, GSAP, ScrollTrigger, and a continuously rendered canvas. These are optional enhancements, not baseline dependencies.

## Accessibility and responsive requirements

- Maintain visible keyboard focus using the accent color with sufficient contrast.
- Preserve semantic headings, labels, table structure, and landmark navigation.
- Provide accessible names for icon-only controls.
- Verify keyboard navigation for dialogs, filters, tables, and menus.
- Test at 1440px, 1280px, 1024px, 768px, 430px, and 390px widths.
- Verify reduced-motion behavior and contrast of orange text/borders against dark surfaces.

## Content rules

- Use Vantage CRE terminology consistently: comps, land sales, sale price, acreage, buyer, seller, market, and transaction.
- Do not use placeholder Nexus copy.
- Do not invent customer logos, testimonials, prices, emails, latency metrics, or compliance claims.
- Every CTA must point to a real route or working action.

## Implementation sequence

1. Global tokens and typography
2. Shared panels, buttons, fields, and navigation
3. Public homepage
4. Dashboard
5. Comp Data table and controls
6. Auth screens and dialogs
7. Content replacement and asset cleanup
8. Motion enhancements
9. Accessibility, responsive, and regression testing

## Source references

- Visual reference: `lib/design/design-template.html`
- Public homepage: `app/page.tsx`
- Global styles: `app/globals.css`
- Authenticated navigation: `components/nav.tsx`
- Dashboard: `app/(app)/dashboard/page.tsx`
- Comp Data UI: `components/comp-data-table.tsx` and `app/(app)/comp-data/page.tsx`
