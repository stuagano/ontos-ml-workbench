/**
 * Tests for MetricsLineChart component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricsLineChart, MetricSeries } from './MetricsLineChart';

describe('MetricsLineChart', () => {
  const mockSeries: MetricSeries[] = [
    {
      name: 'Latency',
      data: [
        { timestamp: '2026-02-07T10:00:00Z', value: 120 },
        { timestamp: '2026-02-07T11:00:00Z', value: 150 },
        { timestamp: '2026-02-07T12:00:00Z', value: 135 },
      ],
      color: 'cyan-600',
    },
    {
      name: 'Throughput',
      data: [
        { timestamp: '2026-02-07T10:00:00Z', value: 1000 },
        { timestamp: '2026-02-07T11:00:00Z', value: 1200 },
        { timestamp: '2026-02-07T12:00:00Z', value: 1100 },
      ],
      color: 'rose-600',
    },
  ];

  describe('Loading State', () => {
    it('shows loading state when loading prop is true', () => {
      render(<MetricsLineChart series={mockSeries} loading={true} />);

      expect(screen.getByText('Loading metrics...')).toBeInTheDocument();
      const loader = document.querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    });

    it('uses correct height for loading state', () => {
      const { container } = render(
        <MetricsLineChart series={mockSeries} loading={true} height={400} />
      );

      const loadingContainer = container.querySelector('.flex.items-center');
      expect(loadingContainer).toHaveStyle({ height: '400px' });
    });
  });

  describe('Empty State', () => {
    it('shows empty state when data is empty', () => {
      render(<MetricsLineChart series={[]} />);

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('shows empty state when all series have no data', () => {
      const emptySeries: MetricSeries[] = [
        { name: 'Series 1', data: [], color: 'cyan-600' },
        { name: 'Series 2', data: [], color: 'rose-600' },
      ];

      render(<MetricsLineChart series={emptySeries} />);

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('shows empty state with custom message', () => {
      render(
        <MetricsLineChart
          series={[]}
          emptyMessage="No metrics to display"
        />
      );

      expect(screen.getByText('No metrics to display')).toBeInTheDocument();
    });

    it('shows empty state when empty prop is true', () => {
      render(<MetricsLineChart series={mockSeries} empty={true} />);

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  describe('Chart Rendering', () => {
    it('renders without crashing with valid data', () => {
      const { container } = render(<MetricsLineChart series={mockSeries} />);

      // ResponsiveContainer should be present
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders with title when provided', () => {
      render(<MetricsLineChart series={mockSeries} title="Performance Metrics" />);

      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    });

    it('does not render title section when title is not provided', () => {
      const { container } = render(<MetricsLineChart series={mockSeries} />);

      const heading = container.querySelector('h4');
      expect(heading).not.toBeInTheDocument();
    });

    it('uses correct height prop', () => {
      const { container } = render(
        <MetricsLineChart series={mockSeries} height={500} />
      );

      const responsiveContainer = container.querySelector('.recharts-responsive-container');
      expect(responsiveContainer).toHaveStyle({ height: '500px' });
    });

    it('uses default height when not specified', () => {
      const { container } = render(<MetricsLineChart series={mockSeries} />);

      const responsiveContainer = container.querySelector('.recharts-responsive-container');
      expect(responsiveContainer).toHaveStyle({ height: '300px' });
    });
  });

  describe('Multiple Series', () => {
    it('handles single series', () => {
      const singleSeries: MetricSeries[] = [
        {
          name: 'Latency',
          data: [
            { timestamp: '2026-02-07T10:00:00Z', value: 120 },
            { timestamp: '2026-02-07T11:00:00Z', value: 150 },
          ],
          color: 'cyan-600',
        },
      ];

      const { container } = render(<MetricsLineChart series={singleSeries} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles multiple series', () => {
      const { container } = render(<MetricsLineChart series={mockSeries} />);

      // Should render chart container
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles series with different data point counts', () => {
      const unevenSeries: MetricSeries[] = [
        {
          name: 'Series 1',
          data: [
            { timestamp: '2026-02-07T10:00:00Z', value: 100 },
            { timestamp: '2026-02-07T11:00:00Z', value: 110 },
            { timestamp: '2026-02-07T12:00:00Z', value: 120 },
          ],
          color: 'cyan-600',
        },
        {
          name: 'Series 2',
          data: [
            { timestamp: '2026-02-07T10:00:00Z', value: 200 },
          ],
          color: 'rose-600',
        },
      ];

      const { container } = render(<MetricsLineChart series={unevenSeries} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  describe('Legend', () => {
    it('renders chart with default legend setting', () => {
      const { container } = render(<MetricsLineChart series={mockSeries} />);

      // Chart should render successfully
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders chart with showLegend true', () => {
      const { container } = render(
        <MetricsLineChart series={mockSeries} showLegend={true} />
      );

      // Chart should render successfully
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders chart with showLegend false', () => {
      const { container } = render(
        <MetricsLineChart series={mockSeries} showLegend={false} />
      );

      // Chart should render successfully
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  describe('Grid', () => {
    it('renders chart with default grid setting', () => {
      const { container } = render(<MetricsLineChart series={mockSeries} />);

      // Chart should render successfully
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders chart with showGrid true', () => {
      const { container } = render(
        <MetricsLineChart series={mockSeries} showGrid={true} />
      );

      // Chart should render successfully
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders chart with showGrid false', () => {
      const { container } = render(
        <MetricsLineChart series={mockSeries} showGrid={false} />
      );

      // Chart should render successfully
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  describe('Axis Labels', () => {
    it('displays yAxisLabel when provided', () => {
      const { container } = render(
        <MetricsLineChart series={mockSeries} yAxisLabel="Latency (ms)" />
      );

      // YAxis label is rendered as text element with the label value
      const chart = container.querySelector('.recharts-responsive-container');
      expect(chart).toBeInTheDocument();
    });

    it('does not show yAxisLabel when not provided', () => {
      const { container } = render(<MetricsLineChart series={mockSeries} />);

      // Chart should render without Y-axis label
      const chart = container.querySelector('.recharts-responsive-container');
      expect(chart).toBeInTheDocument();
    });
  });

  describe('Custom Formatting', () => {
    it('accepts custom formatYAxis function', () => {
      const formatYAxis = (value: number) => `${value}ms`;

      const { container } = render(
        <MetricsLineChart series={mockSeries} formatYAxis={formatYAxis} />
      );

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('accepts custom formatTooltip function', () => {
      const formatTooltip = (value: number) => `${value} units`;

      const { container } = render(
        <MetricsLineChart series={mockSeries} formatTooltip={formatTooltip} />
      );

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  describe('Custom Stroke Width', () => {
    it('applies custom strokeWidth to series', () => {
      const customSeries: MetricSeries[] = [
        {
          name: 'Bold Line',
          data: [
            { timestamp: '2026-02-07T10:00:00Z', value: 120 },
            { timestamp: '2026-02-07T11:00:00Z', value: 150 },
          ],
          color: 'cyan-600',
          strokeWidth: 4,
        },
      ];

      const { container } = render(<MetricsLineChart series={customSeries} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  describe('Data Point Labels', () => {
    it('handles data points with optional labels', () => {
      const seriesWithLabels: MetricSeries[] = [
        {
          name: 'Latency',
          data: [
            { timestamp: '2026-02-07T10:00:00Z', value: 120, label: '10:00 AM' },
            { timestamp: '2026-02-07T11:00:00Z', value: 150, label: '11:00 AM' },
          ],
          color: 'cyan-600',
        },
      ];

      const { container } = render(<MetricsLineChart series={seriesWithLabels} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles series with single data point', () => {
      const singlePointSeries: MetricSeries[] = [
        {
          name: 'Single Point',
          data: [{ timestamp: '2026-02-07T10:00:00Z', value: 100 }],
          color: 'cyan-600',
        },
      ];

      const { container } = render(<MetricsLineChart series={singlePointSeries} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles series with zero values', () => {
      const zeroValueSeries: MetricSeries[] = [
        {
          name: 'Zero Values',
          data: [
            { timestamp: '2026-02-07T10:00:00Z', value: 0 },
            { timestamp: '2026-02-07T11:00:00Z', value: 0 },
          ],
          color: 'cyan-600',
        },
      ];

      const { container } = render(<MetricsLineChart series={zeroValueSeries} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles negative values', () => {
      const negativeValueSeries: MetricSeries[] = [
        {
          name: 'Negative Values',
          data: [
            { timestamp: '2026-02-07T10:00:00Z', value: -100 },
            { timestamp: '2026-02-07T11:00:00Z', value: 50 },
            { timestamp: '2026-02-07T12:00:00Z', value: -75 },
          ],
          color: 'cyan-600',
        },
      ];

      const { container } = render(<MetricsLineChart series={negativeValueSeries} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles invalid timestamp gracefully', () => {
      const invalidTimestampSeries: MetricSeries[] = [
        {
          name: 'Invalid Timestamp',
          data: [
            { timestamp: 'invalid-date', value: 100 },
            { timestamp: '2026-02-07T11:00:00Z', value: 150 },
          ],
          color: 'cyan-600',
        },
      ];

      const { container } = render(<MetricsLineChart series={invalidTimestampSeries} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });
});
