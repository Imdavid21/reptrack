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

## Review gate

Before shipping a UI change, check:

1. Does each screen have one page title and one primary action?
2. Are all user-facing labels sentence case except approved eyebrows/data labels?
3. Is interface text at least 12 px, apart from approved compact exceptions?
4. Does the component use a defined role rather than an arbitrary font size?
5. Is every sentence necessary to complete, understand, or recover from an action?
