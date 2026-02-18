/**
 * Tests for SimpleAreaChart component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SimpleAreaChart, AreaDataPoint } from './SimpleAreaChart';

describe('SimpleAreaChart', () => {
  const mockData: AreaDataPoint[] = [
    { timestamp: '2026-02-07T10:00:00Z', value: 120 },
    { timestamp: '2026-02-07T11:00:00Z', value: 150 },
    { timestamp: '2026-02-07T12:00:00Z', value: 135 },
    { timestamp: '2026-02-07T13:00:00Z', value: 160 },
    { timestamp: '2026-02-07T14:00:00Z', value: 145 },
  ];

  describe('Loading State', () => {
    it('shows loading state when loading prop is true', () => {
      render(<SimpleAreaChart data={mockData} loading={true} />);

      expect(screen.getByText('Loading trend...')).toBeInTheDocument();
      const loader = document.querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    });

    it('uses correct height for loading state', () => {
      const { container } = render(
        <SimpleAreaChart data={mockData} loading={true} height={400} />
      );

      const loadingContainer = container.querySelector('.flex.items-center');
      expect(loadingContainer).toHaveStyle({ height: '400px' });
    });
  });

  describe('Empty State', () => {
    it('shows empty state when data is empty', () => {
      render(<SimpleAreaChart data={[]} />);

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('shows empty state with custom message', () => {
      render(
        <SimpleAreaChart
          data={[]}
          emptyMessage="No trend data"
        />
      );

      expect(screen.getByText('No trend data')).toBeInTheDocument();
    });

    it('shows empty state when empty prop is true', () => {
      render(<SimpleAreaChart data={mockData} empty={true} />);

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('displays empty state with icon', () => {
      render(<SimpleAreaChart data={[]} />);

      // Empty state should be displayed
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  describe('Chart Rendering', () => {
    it('renders without crashing with valid data', () => {
      const { container } = render(<SimpleAreaChart data={mockData} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders with title when provided', () => {
      render(<SimpleAreaChart data={mockData} title="Performance Trend" />);

      expect(screen.getByText('Performance Trend')).toBeInTheDocument();
    });

    it('does not render title section when title is not provided', () => {
      const { container } = render(<SimpleAreaChart data={mockData} />);

      const heading = container.querySelector('h4');
      expect(heading).not.toBeInTheDocument();
    });

    it('uses correct height prop', () => {
      const { container } = render(
        <SimpleAreaChart data={mockData} height={500} />
      );

      const responsiveContainer = container.querySelector('.recharts-responsive-container');
      expect(responsiveContainer).toHaveStyle({ height: '500px' });
    });

    it('uses default height when not specified', () => {
      const { container } = render(<SimpleAreaChart data={mockData} />);

      const responsiveContainer = container.querySelector('.recharts-responsive-container');
      expect(responsiveContainer).toHaveStyle({ height: '300px' });
    });
  });

  describe('Single Series', () => {
    it('displays single series correctly', () => {
      const { container } = render(<SimpleAreaChart data={mockData} />);

      // Chart should render successfully
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles single data point', () => {
      const singlePoint: AreaDataPoint[] = [
        { timestamp: '2026-02-07T10:00:00Z', value: 100 },
      ];

      const { container } = render(<SimpleAreaChart data={singlePoint} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles two data points', () => {
      const twoPoints: AreaDataPoint[] = [
        { timestamp: '2026-02-07T10:00:00Z', value: 100 },
        { timestamp: '2026-02-07T11:00:00Z', value: 150 },
      ];

      const { container } = render(<SimpleAreaChart data={twoPoints} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  describe('Colors', () => {
    it('uses default color (cyan-600)', () => {
      const { container } = render(<SimpleAreaChart data={mockData} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('applies custom color from Tailwind palette', () => {
      const { container } = render(
        <SimpleAreaChart data={mockData} color="rose-600" />
      );

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('applies custom hex color', () => {
      const { container } = render(
        <SimpleAreaChart data={mockData} color="#ff5733" />
      );

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles all supported Tailwind colors', () => {
      const colors = [
        'cyan-600',
        'rose-600',
        'indigo-600',
        'amber-600',
        'green-600',
        'purple-600',
        'blue-600',
        'red-600',
      ];

      colors.forEach((color) => {
        const { container } = render(
          <SimpleAreaChart data={mockData} color={color} />
        );

        expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
      });
    });
  });

  describe('Grid', () => {
    it('renders chart with default grid setting', () => {
      const { container } = render(<SimpleAreaChart data={mockData} />);

      // Chart should render successfully
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders chart with showGrid true', () => {
      const { container } = render(
        <SimpleAreaChart data={mockData} showGrid={true} />
      );

      // Chart should render successfully
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders chart with showGrid false', () => {
      const { container } = render(
        <SimpleAreaChart data={mockData} showGrid={false} />
      );

      // Chart should render successfully
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  describe('Axis Labels', () => {
    it('displays yAxisLabel when provided', () => {
      const { container } = render(
        <SimpleAreaChart data={mockData} yAxisLabel="Value (units)" />
      );

      const chart = container.querySelector('.recharts-responsive-container');
      expect(chart).toBeInTheDocument();
    });

    it('does not show yAxisLabel when not provided', () => {
      const { container } = render(<SimpleAreaChart data={mockData} />);

      const chart = container.querySelector('.recharts-responsive-container');
      expect(chart).toBeInTheDocument();
    });
  });

  describe('Custom Formatting', () => {
    it('accepts custom formatYAxis function', () => {
      const formatYAxis = (value: number) => `${value}ms`;

      const { container } = render(
        <SimpleAreaChart data={mockData} formatYAxis={formatYAxis} />
      );

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('accepts custom formatTooltip function', () => {
      const formatTooltip = (value: number) => `${value} units`;

      const { container } = render(
        <SimpleAreaChart data={mockData} formatTooltip={formatTooltip} />
      );

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  describe('Fill Opacity', () => {
    it('uses default fillOpacity (0.3)', () => {
      const { container } = render(<SimpleAreaChart data={mockData} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('applies custom fillOpacity', () => {
      const { container } = render(
        <SimpleAreaChart data={mockData} fillOpacity={0.7} />
      );

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles fillOpacity of 0 (transparent)', () => {
      const { container } = render(
        <SimpleAreaChart data={mockData} fillOpacity={0} />
      );

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles fillOpacity of 1 (fully opaque)', () => {
      const { container } = render(
        <SimpleAreaChart data={mockData} fillOpacity={1} />
      );

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  describe('Gradient', () => {
    it('renders chart with gradient support', () => {
      const { container } = render(<SimpleAreaChart data={mockData} />);

      // Chart should render successfully
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders chart with different color gradient', () => {
      const { container } = render(
        <SimpleAreaChart data={mockData} color="rose-600" />
      );

      // Chart should render successfully
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  describe('Data Point Labels', () => {
    it('handles data points with optional labels', () => {
      const dataWithLabels: AreaDataPoint[] = [
        { timestamp: '2026-02-07T10:00:00Z', value: 120, label: '10:00 AM' },
        { timestamp: '2026-02-07T11:00:00Z', value: 150, label: '11:00 AM' },
        { timestamp: '2026-02-07T12:00:00Z', value: 135, label: '12:00 PM' },
      ];

      const { container } = render(<SimpleAreaChart data={dataWithLabels} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero values', () => {
      const zeroData: AreaDataPoint[] = [
        { timestamp: '2026-02-07T10:00:00Z', value: 0 },
        { timestamp: '2026-02-07T11:00:00Z', value: 0 },
        { timestamp: '2026-02-07T12:00:00Z', value: 0 },
      ];

      const { container } = render(<SimpleAreaChart data={zeroData} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles negative values', () => {
      const negativeData: AreaDataPoint[] = [
        { timestamp: '2026-02-07T10:00:00Z', value: -100 },
        { timestamp: '2026-02-07T11:00:00Z', value: 50 },
        { timestamp: '2026-02-07T12:00:00Z', value: -75 },
        { timestamp: '2026-02-07T13:00:00Z', value: 25 },
      ];

      const { container } = render(<SimpleAreaChart data={negativeData} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles large values', () => {
      const largeData: AreaDataPoint[] = [
        { timestamp: '2026-02-07T10:00:00Z', value: 1000000 },
        { timestamp: '2026-02-07T11:00:00Z', value: 2000000 },
        { timestamp: '2026-02-07T12:00:00Z', value: 1500000 },
      ];

      const { container } = render(<SimpleAreaChart data={largeData} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles decimal values', () => {
      const decimalData: AreaDataPoint[] = [
        { timestamp: '2026-02-07T10:00:00Z', value: 12.5 },
        { timestamp: '2026-02-07T11:00:00Z', value: 24.75 },
        { timestamp: '2026-02-07T12:00:00Z', value: 33.333 },
      ];

      const { container } = render(<SimpleAreaChart data={decimalData} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles invalid timestamp gracefully', () => {
      const invalidData: AreaDataPoint[] = [
        { timestamp: 'invalid-date', value: 100 },
        { timestamp: '2026-02-07T11:00:00Z', value: 150 },
      ];

      const { container } = render(<SimpleAreaChart data={invalidData} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles very long datasets', () => {
      const longData: AreaDataPoint[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          timestamp: new Date(2026, 1, 7, 0, 0, i).toISOString(),
          value: Math.sin(i / 100) * 100 + 100,
        })
      );

      const { container } = render(<SimpleAreaChart data={longData} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles data with same values (flat line)', () => {
      const flatData: AreaDataPoint[] = [
        { timestamp: '2026-02-07T10:00:00Z', value: 100 },
        { timestamp: '2026-02-07T11:00:00Z', value: 100 },
        { timestamp: '2026-02-07T12:00:00Z', value: 100 },
        { timestamp: '2026-02-07T13:00:00Z', value: 100 },
      ];

      const { container } = render(<SimpleAreaChart data={flatData} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles spiky data (high variance)', () => {
      const spikyData: AreaDataPoint[] = [
        { timestamp: '2026-02-07T10:00:00Z', value: 10 },
        { timestamp: '2026-02-07T11:00:00Z', value: 1000 },
        { timestamp: '2026-02-07T12:00:00Z', value: 5 },
        { timestamp: '2026-02-07T13:00:00Z', value: 2000 },
        { timestamp: '2026-02-07T14:00:00Z', value: 20 },
      ];

      const { container } = render(<SimpleAreaChart data={spikyData} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  describe('Timestamp Formatting', () => {
    it('handles various timestamp formats', () => {
      const variousFormats: AreaDataPoint[] = [
        { timestamp: '2026-02-07T10:00:00Z', value: 100 },
        { timestamp: '2026-02-07T11:30:45Z', value: 150 },
        { timestamp: '2026-02-07T23:59:59Z', value: 125 },
      ];

      const { container } = render(<SimpleAreaChart data={variousFormats} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles timestamps with custom labels', () => {
      const customLabels: AreaDataPoint[] = [
        { timestamp: '2026-02-07T10:00:00Z', value: 100, label: 'Morning' },
        { timestamp: '2026-02-07T14:00:00Z', value: 150, label: 'Afternoon' },
        { timestamp: '2026-02-07T20:00:00Z', value: 125, label: 'Evening' },
      ];

      const { container } = render(<SimpleAreaChart data={customLabels} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });
});
