# RepTrack Design Language

This is the source of truth for product copy and typography. It applies to every app route, dialog, sheet, native/PWA screen, and new component.

## Typography

| Role | Size | Weight | Use |
| --- | --- | --- | --- |
| Display (`h1`) | 30 px | 700 | A page's single primary heading |
| Page title (`h2`) | 24 px | 700 | Screen titles and major dialogs |
| Section title (`h3`) | 20 px | 700 | Major regions within a page |
| Card title (`h4`) | 18 px | 700 | Workout, tracker, and summary titles |
| Item title (`h5`) | 16 px | 700 | List rows and prominent controls |
| Supporting title (`h6`) | 14 px | 600 | Compact card labels only |
| Body (`body1`) | 16 px | 400 | Primary reading and form copy |
| Supporting (`body2`) | 14 px | 400 | Descriptions and secondary content |
| Metadata (`caption`) | 12 px | 500 | Timestamps, units, and quiet status |
| Eyebrow (`overline`) | 11 px | 700 | Short category labels only |

Use tabular numerals for measurements, timers, calories, and sets. Never use less than 12 px for interface copy. The only exceptions are non-interactive chart ticks, compact badges, and bottom-navigation labels, which may use 10–11 px.

Large headings use slightly tight tracking; normal reading copy uses normal tracking. Do not add tracking to body copy.

## Capitalization

- Use sentence case for page titles, buttons, navigation, fields, rows, dialogs, and errors: `Start workout`, `Choose a workout`, `Save changes`.
- Use uppercase only for an eyebrow or compact data label: `TODAY`, `SETS`, `PROTEIN`.
- Do not mix title case, sentence case, and all caps within the same component.
- Exercise names retain their conventional title case. Units stay lowercase: `70 kg`, `637 kcal`, `6 h 15 m`.

## Copy

- Lead with the user's action or result. Buttons start with a verb.
- Name the object: `Save workout`, not `Save`; `Cancel workout`, not `Cancel` when the consequence matters.
- Do not narrate what is already visible. Prefer `Protein 27 / 165 g` over a paragraph explaining it.
- Use a middle dot (`·`) for compact, related metadata. Use a vertical divider (`|`) only in dense tabular-style summaries. Do not use decorative dots as separators.
- Use an em dash only for a deliberate interruption or contrast; otherwise write a separate sentence.
- Errors say what failed and what the user can do next. Success feedback is short and factual.

## Hierarchy and layout

- One primary action per screen or sheet. Supporting actions are text/outlined buttons.
- One eyebrow maximum per card; it must label a group, not repeat its title.
- Use `h4` for card titles, `body2` for explanation, and `caption` for metadata. Do not compensate for unclear hierarchy with more bold text.
- Interactive labels must meet the body/small-label scale; icon buttons require an accessible label.

## Product signature

RepTrack is recognisable through three recurring patterns:

1. **Metric first:** the changing number is dominant, the unit is quiet, and context sits on the following line.
2. **Weight × reps:** training performance always uses `weight kg × reps` with tabular numerals and a true multiplication sign.
3. **Restrained state:** active and completed states combine a semantic accent with a non-colour marker such as a check, label, or progress position.

Use `.metric-hero`, `.metric-unit`, `.metric-supporting`, and `.metric-context` rather than creating local metric typography.

## Layout tokens

| Token | Value | Use |
| --- | --- | --- |
| Space scale | 4, 8, 12, 16, 20, 24, 32, 40 px | All gaps, padding, and section rhythm |
| Control radius | 12 px | Inputs and rectangular controls |
| Card radius | 16 px | Cards and grouped surfaces |
| Sheet radius | 24 px | Dialogs and bottom sheets |
| Small control | 36 px | Compact desktop-only controls |
| Standard control | 44 px | Default inputs, buttons, and icon targets |
| Large control | 52 px | Primary workout and logging actions |
| Icon scale | 16, 20, 24 px | Inline, standard, and prominent icons |

Cards use a one-pixel semantic border and near-flat elevation. Sheets use the stronger overlay elevation. Do not introduce isolated radii, shadows, or arbitrary opacity values.

## Semantic colour anatomy

Each health domain has four roles: `foreground`, `surface`, `border`, and `strong`. Use the role matching the component anatomy rather than applying opacity to the base colour.

- Training: `energy`, `energy-ink`, `energy-soft`, `energy-border`
- Hydration: `water`, `water-ink`, `water-soft`, `water-border`
- Nutrition: `fuel`, `fuel-ink`, `fuel-soft`, `fuel-border`
- Recovery: `recover`, `recover-ink`, `recover-soft`, `recover-border`

Domain colour identifies subject matter. Completion, generic success, PRs, and improvement must also include text or iconography and must not be represented as interchangeable green states.

## Interaction states

- **Default:** neutral surface and readable border.
- **Hover:** one surface step stronger; never colour alone.
- **Pressed:** `0.98` scale for controls and `0.985` for interactive surfaces.
- **Selected/active:** semantic border or foreground plus a visible marker.
- **Completed:** checkmark or completion label plus restrained training colour where applicable.
- **Disabled:** muted surface and text; no press transform.
- **Focus:** two-pixel visible ring with three-pixel clearance.
- **Loading:** preserve control dimensions and label the action state.
- **Error:** destructive foreground/surface plus actionable text.

Transitions are 120–180 ms with an ease-out physical response. Respect `prefers-reduced-motion` globally.

## Density

- Dashboard: spacious, 16–24 px internal padding.
- Workout logging: compact, 8–16 px rhythm with 44–52 px controls.
- Exercise history: dense rows with 12–16 px padding.
- Settings: standard 16 px rhythm.
- Charts and analysis: 20–24 px breathing room around the primary data area.

## Review gate

Before shipping a UI change, check:

1. Does each screen have one page title and one primary action?
2. Are all user-facing labels sentence case except approved eyebrows/data labels?
3. Is interface text at least 12 px, apart from approved compact exceptions?
4. Does the component use a defined role rather than an arbitrary font size?
5. Is every sentence necessary to complete, understand, or recover from an action?
