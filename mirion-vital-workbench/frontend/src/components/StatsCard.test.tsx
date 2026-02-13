/**
 * Tests for StatsCard component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsCard } from './StatsCard';
import { Database, Users, FileText } from 'lucide-react';

describe('StatsCard', () => {
  const defaultProps = {
    title: 'Total Sheets',
    value: 42,
    icon: Database,
    color: 'text-purple-600',
  };

  describe('Basic rendering', () => {
    it('renders title, value, and icon correctly', () => {
      render(<StatsCard {...defaultProps} />);

      expect(screen.getByText('Total Sheets')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders with string value', () => {
      render(<StatsCard {...defaultProps} value="1.2K" />);

      expect(screen.getByText('1.2K')).toBeInTheDocument();
    });

    it('applies color class correctly', () => {
      const { container } = render(<StatsCard {...defaultProps} />);

      expect(container.querySelector('.text-purple-600')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <StatsCard {...defaultProps} className="custom-stats-class" />
      );

      expect(container.querySelector('.custom-stats-class')).toBeInTheDocument();
    });
  });

  describe('Subtitle', () => {
    it('shows subtitle when provided', () => {
      render(<StatsCard {...defaultProps} subtitle="Across all workspaces" />);

      expect(screen.getByText('Across all workspaces')).toBeInTheDocument();
    });

    it('works without subtitle', () => {
      render(<StatsCard {...defaultProps} />);

      expect(screen.getByText('Total Sheets')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  describe('Integration with MetricCard', () => {
    it('renders as a button element', () => {
      render(<StatsCard {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled(); // No onClick provided
    });

    it('does not show trend indicator', () => {
      render(<StatsCard {...defaultProps} />);

      // StatsCard never shows trend indicators (no change prop support)
      expect(screen.queryByText(/vs last period/)).not.toBeInTheDocument();
    });

    it('applies default non-clickable styling', () => {
      const { container } = render(<StatsCard {...defaultProps} />);

      const button = container.querySelector('.cursor-default');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Multiple icon types', () => {
    it('renders with Database icon', () => {
      render(<StatsCard {...defaultProps} icon={Database} />);

      expect(screen.getByText('Total Sheets')).toBeInTheDocument();
    });

    it('renders with Users icon', () => {
      render(<StatsCard {...defaultProps} icon={Users} title="Active Users" />);

      expect(screen.getByText('Active Users')).toBeInTheDocument();
    });

    it('renders with FileText icon', () => {
      render(
        <StatsCard {...defaultProps} icon={FileText} title="Documents" />
      );

      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
  });

  describe('Color variants', () => {
    it('applies blue color', () => {
      const { container } = render(
        <StatsCard {...defaultProps} color="text-blue-600" />
      );

      expect(container.querySelector('.text-blue-600')).toBeInTheDocument();
    });

    it('applies green color', () => {
      const { container } = render(
        <StatsCard {...defaultProps} color="text-green-600" />
      );

      expect(container.querySelector('.text-green-600')).toBeInTheDocument();
    });

    it('applies amber color', () => {
      const { container } = render(
        <StatsCard {...defaultProps} color="text-amber-600" />
      );

      expect(container.querySelector('.text-amber-600')).toBeInTheDocument();
    });
  });

  describe('Real-world scenarios', () => {
    it('displays training sheet statistics', () => {
      render(
        <StatsCard
          title="Training Sheets"
          value={156}
          subtitle="Ready for training"
          icon={FileText}
          color="text-blue-600"
        />
      );

      expect(screen.getByText('Training Sheets')).toBeInTheDocument();
      expect(screen.getByText('156')).toBeInTheDocument();
      expect(screen.getByText('Ready for training')).toBeInTheDocument();
    });

    it('displays user statistics', () => {
      render(
        <StatsCard
          title="Active Experts"
          value={12}
          subtitle="Last 24 hours"
          icon={Users}
          color="text-green-600"
        />
      );

      expect(screen.getByText('Active Experts')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('Last 24 hours')).toBeInTheDocument();
    });
  });
});
