/**
 * Tests for MetricCard component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MetricCard } from './MetricCard';
import { Activity } from 'lucide-react';

describe('MetricCard', () => {
  const defaultProps = {
    title: 'Active Users',
    value: 1234,
    icon: Activity,
    color: 'text-blue-600',
  };

  describe('Basic rendering', () => {
    it('renders title, value, and icon correctly', () => {
      render(<MetricCard {...defaultProps} />);

      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('1234')).toBeInTheDocument();
    });

    it('renders with string value', () => {
      render(<MetricCard {...defaultProps} value="12.5K" />);

      expect(screen.getByText('12.5K')).toBeInTheDocument();
    });

    it('applies color class to icon', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      const iconElement = container.querySelector('.text-blue-600');

      expect(iconElement).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <MetricCard {...defaultProps} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Trend indicator', () => {
    it('shows trend indicator when change prop provided', () => {
      render(<MetricCard {...defaultProps} change={15} />);

      expect(screen.getByText(/15% vs last period/)).toBeInTheDocument();
    });

    it('shows green color and TrendingUp icon for positive change', () => {
      const { container } = render(<MetricCard {...defaultProps} change={15} />);

      const trendElement = container.querySelector('.text-green-600');
      expect(trendElement).toBeInTheDocument();
      expect(screen.getByText(/15% vs last period/)).toBeInTheDocument();
    });

    it('shows red color and TrendingDown icon for negative change', () => {
      const { container } = render(<MetricCard {...defaultProps} change={-8} />);

      const trendElement = container.querySelector('.text-red-600');
      expect(trendElement).toBeInTheDocument();
      expect(screen.getByText(/8% vs last period/)).toBeInTheDocument();
    });

    it('treats zero change as positive', () => {
      const { container } = render(<MetricCard {...defaultProps} change={0} />);

      const trendElement = container.querySelector('.text-green-600');
      expect(trendElement).toBeInTheDocument();
      expect(screen.getByText(/0% vs last period/)).toBeInTheDocument();
    });

    it('does not show subtitle when change is provided', () => {
      render(
        <MetricCard
          {...defaultProps}
          change={15}
          subtitle="This should not appear"
        />
      );

      expect(screen.queryByText('This should not appear')).not.toBeInTheDocument();
    });
  });

  describe('Subtitle', () => {
    it('shows subtitle when provided and no change', () => {
      render(<MetricCard {...defaultProps} subtitle="Last 7 days" />);

      expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    });

    it('applies modified color class to subtitle', () => {
      const { container } = render(
        <MetricCard
          {...defaultProps}
          color="text-blue-600"
          subtitle="Last 7 days"
        />
      );

      const subtitleElement = container.querySelector('.text-blue-500');
      expect(subtitleElement).toBeInTheDocument();
    });
  });

  describe('Click handling', () => {
    it('calls onClick handler when clicked', () => {
      const onClick = vi.fn();
      render(<MetricCard {...defaultProps} onClick={onClick} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(onClick).toHaveBeenCalledOnce();
    });

    it('applies hover styles when onClick provided', () => {
      const onClick = vi.fn();
      const { container } = render(
        <MetricCard {...defaultProps} onClick={onClick} />
      );

      const button = container.querySelector('.cursor-pointer');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('hover:border-rose-300');
    });

    it('does not apply hover styles when onClick not provided', () => {
      const { container } = render(<MetricCard {...defaultProps} />);

      const button = container.querySelector('.cursor-default');
      expect(button).toBeInTheDocument();
      expect(button).not.toHaveClass('cursor-pointer');
    });

    it('disables button when onClick not provided', () => {
      render(<MetricCard {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('enables button when onClick provided', () => {
      const onClick = vi.fn();
      render(<MetricCard {...defaultProps} onClick={onClick} />);

      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });
  });

  describe('Multiple color variants', () => {
    it('applies green color class', () => {
      const { container } = render(
        <MetricCard {...defaultProps} color="text-green-600" />
      );

      expect(container.querySelector('.text-green-600')).toBeInTheDocument();
    });

    it('applies red color class', () => {
      const { container } = render(
        <MetricCard {...defaultProps} color="text-red-600" />
      );

      expect(container.querySelector('.text-red-600')).toBeInTheDocument();
    });

    it('applies amber color class', () => {
      const { container } = render(
        <MetricCard {...defaultProps} color="text-amber-600" />
      );

      expect(container.querySelector('.text-amber-600')).toBeInTheDocument();
    });
  });
});
