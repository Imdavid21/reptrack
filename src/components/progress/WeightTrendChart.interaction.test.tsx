import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeightTrendChart } from './WeightTrendChart';

const metrics = [
  { date: '2026-08-20', bodyweight: 73.2 },
  { date: '2026-08-21', bodyweight: 73.0 },
  { date: '2026-08-22', bodyweight: 72.8 },
] as never;

describe('WeightTrendChart interaction', () => {
  it('supports keyboard point inspection', () => {
    render(<WeightTrendChart metrics={metrics} target={68} />);
    const chart = screen.getByRole('group', { name: /interactive bodyweight chart/i });

    fireEvent.focus(chart);
    expect(screen.getByText('22 Aug 2026')).toBeInTheDocument();
    expect(screen.getByText('72.8 kg')).toBeInTheDocument();

    fireEvent.keyDown(chart, { key: 'ArrowLeft' });
    expect(screen.getByText('21 Aug 2026')).toBeInTheDocument();

    fireEvent.keyDown(chart, { key: 'Escape' });
    expect(screen.queryByText('21 Aug 2026')).not.toBeInTheDocument();
  });
});
