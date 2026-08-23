# Chart interaction

RepTrack charts that encode inspectable data should expose the underlying value without requiring the user to infer it from an axis.

- Desktop: hover the nearest point, bar, or segment.
- Touch: tap or drag across the chart.
- Keyboard: custom charts must expose equivalent point inspection where practical.
- Tooltips should show the date/category plus the values needed to interpret that mark.
- Large interaction regions are preferred over requiring a pointer to land on a small dot.
- Decorative meters, progress bars, and confidence marks are not treated as charts.
- Missing values stay missing. Tooltips must not convert absent data to zero.
