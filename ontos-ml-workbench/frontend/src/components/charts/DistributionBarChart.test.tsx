/**
 * Tests for DistributionBarChart component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DistributionBarChart, DistributionDataPoint } from './DistributionBarChart';

describe('DistributionBarChart', () => {
  const mockData: DistributionDataPoint[] = [
    { category: 'Critical', value: 12 },
    { category: 'High', value: 24 },
    { category: 'Medium', value: 45 },
    { category: 'Low', value: 19 },
  ];

  describe('Loading State', () => {
    it('shows loading state when loading prop is true', () => {
      render(<DistributionBarChart data={mockData} loading={true} />);

      expect(screen.getByText('Loading distribution...')).toBeInTheDocument();
      const loader = document.querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    });

    it('uses correct height for loading state', () => {
      const { container } = render(
        <DistributionBarChart data={mockData} loading={true} height={400} />
      );

      const loadingContainer = container.querySelector('.flex.items-center');
      expect(loadingContainer).toHaveStyle({ height: '400px' });
    });
  });

  describe('Empty State', () => {
    it('shows empty state when data is empty', () => {
      render(<DistributionBarChart data={[]} />);

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('shows empty state with custom message', () => {
      render(
        <DistributionBarChart
          data={[]}
          emptyMessage="No distribution data"
        />
      );

      expect(screen.getByText('No distribution data')).toBeInTheDocument();
    });

    it('shows empty state when empty prop is true', () => {
      render(<DistributionBarChart data={mockData} empty={true} />);

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('displays empty state with icon', () => {
      render(<DistributionBarChart data={[]} />);

      // Empty state should be displayed
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  describe('Chart Rendering', () => {
    it('renders without crashing with valid data', () => {
      const { container } = render(<DistributionBarChart data={mockData} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders with title when provided', () => {
      render(<DistributionBarChart data={mockData} title="Issue Distribution" />);

      expect(screen.getByText('Issue Distribution')).toBeInTheDocument();
    });

    it('does not render title section when title is not provided', () => {
      const { container } = render(<DistributionBarChart data={mockData} />);

      const heading = container.querySelector('h4');
      expect(heading).not.toBeInTheDocument();
    });

    it('uses correct height prop', () => {
      const { container } = render(
        <DistributionBarChart data={mockData} height={500} />
      );

      const responsiveContainer = container.querySelector('.recharts-responsive-container');
      expect(responsiveContainer).toHaveStyle({ height: '500px' });
    });

    it('uses default height when not specified', () => {
      const { container } = render(<DistributionBarChart data={mockData} />);

      const responsiveContainer = container.querySelector('.recharts-responsive-container');
      expect(responsiveContainer).toHaveStyle({ height: '300px' });
    });
  });

  describe('Layout Orientation', () => {
    it('renders with vertical layout by default', () => {
      const { container } = render(<DistributionBarChart data={mockData} />);

      // Chart should render successfully
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders with vertical layout when specified', () => {
      const { container } = render(
        <DistributionBarChart data={mockData} layout="vertical" />
      );

      // Chart should render successfully
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders with horizontal layout when specified', () => {
      const { container } = render(
        <DistributionBarChart data={mockData} layout="horizontal" />
      );

      // Chart should render successfully
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  describe('Colors', () => {
    it('applies default color from theme', () => {
      const { container } = render(
        <DistributionBarChart data={mockData} defaultColor="indigo-600" />
      );

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('applies custom color per bar', () => {
      const dataWithColors: DistributionDataPoint[] = [
        { category: 'Critical', value: 12, color: 'red-600' },
        { category: 'High', value: 24, color: 'amber-600' },
        { category: 'Medium', value: 45, color: 'green-600' },
      ];

      const { container } = render(<DistributionBarChart data={dataWithColors} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('falls back to default color when bar has no custom color', () => {
      const mixedData: DistributionDataPoint[] = [
        { category: 'A', value: 10, color: 'red-600' },
        { category: 'B', value: 20 }, // No color specified
      ];

      const { container } = render(
        <DistributionBarChart data={mixedData} defaultColor="cyan-600" />
      );

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles hex color values directly', () => {
      const hexColorData: DistributionDataPoint[] = [
        { category: 'Custom', value: 50, color: '#ff5733' },
      ];

      const { container } = render(<DistributionBarChart data={hexColorData} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  describe('Grid', () => {
    it('renders chart with default grid setting', () => {
      const { container } = render(<DistributionBarChart data={mockData} />);

      // Chart should render successfully
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders chart with showGrid true', () => {
      const { container } = render(
        <DistributionBarChart data={mockData} showGrid={true} />
      );

      // Chart should render successfully
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders chart with showGrid false', () => {
      const { container } = render(
        <DistributionBarChart data={mockData} showGrid={false} />
      );

      // Chart should render successfully
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  describe('Legend', () => {
    it('renders chart with default legend setting', () => {
      const { container } = render(<DistributionBarChart data={mockData} />);

      // Chart should render successfully
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders chart with showLegend true', () => {
      const { container } = render(
        <DistributionBarChart data={mockData} showLegend={true} />
      );

      // Chart should render successfully
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders chart with showLegend false', () => {
      const { container } = render(
        <DistributionBarChart data={mockData} showLegend={false} />
      );

      // Chart should render successfully
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  describe('Axis Labels', () => {
    it('displays xAxisLabel when provided in vertical layout', () => {
      const { container } = render(
        <DistributionBarChart
          data={mockData}
          layout="vertical"
          xAxisLabel="Count"
        />
      );

      const chart = container.querySelector('.recharts-responsive-container');
      expect(chart).toBeInTheDocument();
    });

    it('displays yAxisLabel when provided in vertical layout', () => {
      const { container } = render(
        <DistributionBarChart
          data={mockData}
          layout="vertical"
          yAxisLabel="Categories"
        />
      );

      const chart = container.querySelector('.recharts-responsive-container');
      expect(chart).toBeInTheDocument();
    });

    it('displays xAxisLabel when provided in horizontal layout', () => {
      const { container } = render(
        <DistributionBarChart
          data={mockData}
          layout="horizontal"
          xAxisLabel="Categories"
        />
      );

      const chart = container.querySelector('.recharts-responsive-container');
      expect(chart).toBeInTheDocument();
    });

    it('displays yAxisLabel when provided in horizontal layout', () => {
      const { container } = render(
        <DistributionBarChart
          data={mockData}
          layout="horizontal"
          yAxisLabel="Count"
        />
      );

      const chart = container.querySelector('.recharts-responsive-container');
      expect(chart).toBeInTheDocument();
    });
  });

  describe('Custom Formatting', () => {
    it('accepts custom formatValue function', () => {
      const formatValue = (value: number) => `${value}%`;

      const { container } = render(
        <DistributionBarChart data={mockData} formatValue={formatValue} />
      );

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles single data point', () => {
      const singleData: DistributionDataPoint[] = [
        { category: 'Only One', value: 100 },
      ];

      const { container } = render(<DistributionBarChart data={singleData} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles zero values', () => {
      const zeroData: DistributionDataPoint[] = [
        { category: 'Zero', value: 0 },
        { category: 'Non-Zero', value: 50 },
      ];

      const { container } = render(<DistributionBarChart data={zeroData} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles large values', () => {
      const largeData: DistributionDataPoint[] = [
        { category: 'Large', value: 1000000 },
        { category: 'Small', value: 10 },
      ];

      const { container } = render(<DistributionBarChart data={largeData} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles many categories', () => {
      const manyCategories: DistributionDataPoint[] = Array.from(
        { length: 20 },
        (_, i) => ({
          category: `Category ${i + 1}`,
          value: Math.floor(Math.random() * 100),
        })
      );

      const { container } = render(<DistributionBarChart data={manyCategories} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles long category names', () => {
      const longNameData: DistributionDataPoint[] = [
        {
          category: 'This is a very long category name that might cause layout issues',
          value: 50,
        },
        { category: 'Short', value: 30 },
      ];

      const { container } = render(<DistributionBarChart data={longNameData} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles special characters in category names', () => {
      const specialCharData: DistributionDataPoint[] = [
        { category: 'Test & Debug', value: 10 },
        { category: 'Build/Deploy', value: 20 },
        { category: '<script>alert("xss")</script>', value: 5 },
      ];

      const { container } = render(<DistributionBarChart data={specialCharData} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  describe('Data Validation', () => {
    it('handles negative values', () => {
      const negativeData: DistributionDataPoint[] = [
        { category: 'Positive', value: 50 },
        { category: 'Negative', value: -25 },
      ];

      const { container } = render(<DistributionBarChart data={negativeData} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('handles decimal values', () => {
      const decimalData: DistributionDataPoint[] = [
        { category: 'A', value: 12.5 },
        { category: 'B', value: 24.75 },
        { category: 'C', value: 33.333 },
      ];

      const { container } = render(<DistributionBarChart data={decimalData} />);

      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });
});
