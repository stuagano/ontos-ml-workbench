/**
 * Tests for StatusBadge component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';
import {
  ENDPOINT_STATUS_CONFIG,
  JOB_STATUS_CONFIG,
  MONITOR_ENDPOINT_STATUS_CONFIG,
} from '../constants/statusConfig';
import { Activity } from 'lucide-react';
import type { StatusConfig } from '../constants/statusConfig';

describe('StatusBadge', () => {
  describe('Basic rendering', () => {
    it('renders with correct status label', () => {
      const config = ENDPOINT_STATUS_CONFIG.READY;
      render(<StatusBadge config={config} />);

      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    it('shows correct icon based on status config', () => {
      const config = ENDPOINT_STATUS_CONFIG.READY;
      render(<StatusBadge config={config} />);

      // Icon should be present - checking for the span wrapper
      const badge = screen.getByText('Ready').parentElement;
      expect(badge).toBeInTheDocument();
    });

    it('applies correct colors from config', () => {
      const config = ENDPOINT_STATUS_CONFIG.READY;
      const { container } = render(<StatusBadge config={config} />);

      expect(container.querySelector('.text-green-600')).toBeInTheDocument();
      expect(container.querySelector('.bg-green-50')).toBeInTheDocument();
    });
  });

  describe('Endpoint statuses', () => {
    it('renders READY status correctly', () => {
      render(<StatusBadge config={ENDPOINT_STATUS_CONFIG.READY} />);

      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    it('renders NOT_READY status correctly', () => {
      render(<StatusBadge config={ENDPOINT_STATUS_CONFIG.NOT_READY} />);

      expect(screen.getByText('Starting')).toBeInTheDocument();
    });

    it('renders PENDING status correctly', () => {
      render(<StatusBadge config={ENDPOINT_STATUS_CONFIG.PENDING} />);

      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('renders FAILED status correctly', () => {
      render(<StatusBadge config={ENDPOINT_STATUS_CONFIG.FAILED} />);

      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('renders unknown status correctly', () => {
      render(<StatusBadge config={ENDPOINT_STATUS_CONFIG.unknown} />);

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  describe('Job statuses', () => {
    it('renders pending job status', () => {
      render(<StatusBadge config={JOB_STATUS_CONFIG.pending} />);

      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('renders running job status', () => {
      render(<StatusBadge config={JOB_STATUS_CONFIG.running} />);

      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    it('renders succeeded job status', () => {
      render(<StatusBadge config={JOB_STATUS_CONFIG.succeeded} />);

      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('renders failed job status', () => {
      render(<StatusBadge config={JOB_STATUS_CONFIG.failed} />);

      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('renders cancelled job status', () => {
      render(<StatusBadge config={JOB_STATUS_CONFIG.cancelled} />);

      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });
  });

  describe('Monitor variant', () => {
    it('shows "Healthy" label for READY status in monitor context', () => {
      render(<StatusBadge config={MONITOR_ENDPOINT_STATUS_CONFIG.READY} />);

      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.queryByText('Ready')).not.toBeInTheDocument();
    });

    it('maintains same colors for monitor variant', () => {
      const { container } = render(
        <StatusBadge config={MONITOR_ENDPOINT_STATUS_CONFIG.READY} />
      );

      expect(container.querySelector('.text-green-600')).toBeInTheDocument();
      expect(container.querySelector('.bg-green-50')).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('shows animation for NOT_READY status when animate is true', () => {
      const { container } = render(
        <StatusBadge config={ENDPOINT_STATUS_CONFIG.NOT_READY} animate={true} />
      );

      const badge = container.querySelector('.animate-spin');
      expect(badge).toBeInTheDocument();
    });

    it('does not animate by default', () => {
      const { container } = render(
        <StatusBadge config={ENDPOINT_STATUS_CONFIG.NOT_READY} />
      );

      const badge = container.querySelector('.animate-spin');
      expect(badge).not.toBeInTheDocument();
    });

    it('does not animate when explicitly set to false', () => {
      const { container } = render(
        <StatusBadge
          config={ENDPOINT_STATUS_CONFIG.NOT_READY}
          animate={false}
        />
      );

      const badge = container.querySelector('.animate-spin');
      expect(badge).not.toBeInTheDocument();
    });

    it('can animate any status when animate is true', () => {
      const { container } = render(
        <StatusBadge config={ENDPOINT_STATUS_CONFIG.READY} animate={true} />
      );

      const badge = container.querySelector('.animate-spin');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Size variants', () => {
    it('renders small size correctly', () => {
      const { container } = render(
        <StatusBadge config={ENDPOINT_STATUS_CONFIG.READY} size="sm" />
      );

      const badge = container.querySelector('.px-2.py-0\\.5.text-xs');
      expect(badge).toBeInTheDocument();
    });

    it('renders medium size by default', () => {
      const { container } = render(
        <StatusBadge config={ENDPOINT_STATUS_CONFIG.READY} />
      );

      const badge = container.querySelector('.px-2.py-1.text-xs');
      expect(badge).toBeInTheDocument();
    });

    it('renders large size correctly', () => {
      const { container } = render(
        <StatusBadge config={ENDPOINT_STATUS_CONFIG.READY} size="lg" />
      );

      const badge = container.querySelector('.px-3.py-1\\.5.text-sm');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Custom styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <StatusBadge
          config={ENDPOINT_STATUS_CONFIG.READY}
          className="custom-badge-class"
        />
      );

      expect(container.querySelector('.custom-badge-class')).toBeInTheDocument();
    });

    it('maintains default classes with custom className', () => {
      const { container } = render(
        <StatusBadge
          config={ENDPOINT_STATUS_CONFIG.READY}
          className="ml-2"
        />
      );

      const badge = container.querySelector('.rounded-full.font-medium.flex');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('ml-2');
    });
  });

  describe('Color combinations', () => {
    it('renders green colors for success states', () => {
      const { container } = render(
        <StatusBadge config={ENDPOINT_STATUS_CONFIG.READY} />
      );

      expect(container.querySelector('.text-green-600')).toBeInTheDocument();
      expect(container.querySelector('.bg-green-50')).toBeInTheDocument();
    });

    it('renders red colors for failure states', () => {
      const { container } = render(
        <StatusBadge config={ENDPOINT_STATUS_CONFIG.FAILED} />
      );

      expect(container.querySelector('.text-red-600')).toBeInTheDocument();
      expect(container.querySelector('.bg-red-50')).toBeInTheDocument();
    });

    it('renders amber colors for starting states', () => {
      const { container } = render(
        <StatusBadge config={ENDPOINT_STATUS_CONFIG.NOT_READY} />
      );

      expect(container.querySelector('.text-amber-600')).toBeInTheDocument();
      expect(container.querySelector('.bg-amber-50')).toBeInTheDocument();
    });

    it('renders blue colors for pending states', () => {
      const { container } = render(
        <StatusBadge config={ENDPOINT_STATUS_CONFIG.PENDING} />
      );

      expect(container.querySelector('.text-blue-600')).toBeInTheDocument();
      expect(container.querySelector('.bg-blue-50')).toBeInTheDocument();
    });

    it('renders gray colors for unknown states', () => {
      const { container } = render(
        <StatusBadge config={ENDPOINT_STATUS_CONFIG.unknown} />
      );

      expect(container.querySelector('.text-gray-600')).toBeInTheDocument();
      expect(container.querySelector('.bg-gray-50')).toBeInTheDocument();
    });
  });

  describe('Custom config', () => {
    it('handles custom status config', () => {
      const customConfig: StatusConfig = {
        icon: Activity,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        label: 'Custom Status',
      };

      render(<StatusBadge config={customConfig} />);

      expect(screen.getByText('Custom Status')).toBeInTheDocument();
    });

    it('applies custom colors from config', () => {
      const customConfig: StatusConfig = {
        icon: Activity,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        label: 'Custom Status',
      };

      const { container } = render(<StatusBadge config={customConfig} />);

      expect(container.querySelector('.text-purple-600')).toBeInTheDocument();
      expect(container.querySelector('.bg-purple-50')).toBeInTheDocument();
    });
  });

  describe('Real-world scenarios', () => {
    it('displays endpoint starting with animation', () => {
      render(
        <StatusBadge
          config={ENDPOINT_STATUS_CONFIG.NOT_READY}
          animate={true}
          size="md"
        />
      );

      expect(screen.getByText('Starting')).toBeInTheDocument();
    });

    it('displays healthy endpoint in monitor page', () => {
      render(
        <StatusBadge
          config={MONITOR_ENDPOINT_STATUS_CONFIG.READY}
          size="sm"
        />
      );

      expect(screen.getByText('Healthy')).toBeInTheDocument();
    });

    it('displays failed training job', () => {
      render(
        <StatusBadge config={JOB_STATUS_CONFIG.failed} size="lg" />
      );

      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('displays running job with custom styling', () => {
      render(
        <StatusBadge
          config={JOB_STATUS_CONFIG.running}
          animate={true}
          className="ml-4"
        />
      );

      expect(screen.getByText('Running')).toBeInTheDocument();
    });
  });
});
