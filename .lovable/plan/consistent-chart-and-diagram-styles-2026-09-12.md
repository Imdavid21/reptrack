# Consistent Chart And Diagram Styles

## Goal
Make charts and diagrams across the app feel like one visual system while keeping every metric, interaction, and calculation unchanged.

## Changes
- Create shared React chart tokens for axes, grid lines, tooltips, reference lines, series, points, bars, heights, and number formatting.
- Apply the shared system to Dataroom, Insights, bodyweight, calories, macros, hydration, exercise progression, workout ratings, and other data visuals.
- Keep metric-specific colors only where they communicate meaning, such as recovery, water, intake, burn, and macro categories.
- Align custom SVG diagrams with the same line weights, grid opacity, point treatment, tooltip surfaces, and interaction states.
- Preserve accessibility in light and dark themes, keyboard/touch interactions, reduced motion, and readable contrast.
- Verify representative chart pages at desktop and mobile widths and run focused chart tests.

## Technical Details
- Continue using React and the existing Recharts/custom React SVG implementations.
- Centralize reusable chart styling in a typed utility module and shared tooltip components.
- Avoid changing data queries, calculations, date ranges, or backend behavior.
