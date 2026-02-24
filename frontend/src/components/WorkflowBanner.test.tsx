/**
 * Tests for WorkflowBanner component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkflowBanner } from './WorkflowBanner';
import type { WorkflowState } from '../context/WorkflowContext';

// Mock WorkflowContext
const mockGoToPreviousStage = vi.fn();
const mockGoToNextStage = vi.fn();
const mockResetWorkflow = vi.fn();
const mockSetCurrentStage = vi.fn();

let mockState: WorkflowState = {
  currentStage: 'data',
  selectedSource: null,
  sourceColumns: [],
  datasetConfig: null,
  selectedTemplate: null,
  selectedTrainingSheetId: null,
  curationConfig: {},
  trainingConfig: {},
  deploymentConfig: {},
};

// Mock the WorkflowContext module
vi.mock('../context/WorkflowContext', () => ({
  useWorkflow: () => ({
    state: mockState,
    goToPreviousStage: mockGoToPreviousStage,
    goToNextStage: mockGoToNextStage,
    resetWorkflow: mockResetWorkflow,
    setCurrentStage: mockSetCurrentStage,
  }),
}));

// Helper to render component with mocked context
const renderWithContext = (
  stage: 'deploy' | 'monitor' | 'improve',
  state: Partial<WorkflowState> = {}
) => {
  mockState = {
    currentStage: 'data',
    selectedSource: null,
    sourceColumns: [],
    datasetConfig: null,
    selectedTemplate: null,
    selectedTrainingSheetId: null,
    curationConfig: {},
    trainingConfig: {},
    deploymentConfig: {},
    ...state,
  };

  return render(<WorkflowBanner stage={stage} />);
};

describe('WorkflowBanner', () => {
  beforeEach(() => {
    mockGoToPreviousStage.mockClear();
    mockGoToNextStage.mockClear();
    mockResetWorkflow.mockClear();
    mockSetCurrentStage.mockClear();
    vi.resetModules();
  });

  describe('Stage Rendering', () => {
    it('renders deploy stage with cyan styling', () => {
      renderWithContext('deploy');
      const banner = screen.getByText('Back to Train').closest('div')?.parentElement?.parentElement;
      expect(banner).toBeInTheDocument();
      expect(banner?.className).toContain('from-cyan-50');
      expect(banner?.className).toContain('to-blue-50');
      expect(banner?.className).toContain('border-cyan-200');
    });

    it('renders monitor stage with rose styling', () => {
      renderWithContext('monitor');
      const banner = screen.getByText('Back to Deploy').closest('div')?.parentElement?.parentElement;
      expect(banner).toBeInTheDocument();
      expect(banner?.className).toContain('from-rose-50');
      expect(banner?.className).toContain('to-pink-50');
      expect(banner?.className).toContain('border-rose-200');
    });

    it('renders improve stage with indigo styling', () => {
      renderWithContext('improve');
      const banner = screen.getByText('Back to Monitor').closest('div')?.parentElement?.parentElement;
      expect(banner).toBeInTheDocument();
      expect(banner?.className).toContain('from-indigo-50');
      expect(banner?.className).toContain('to-purple-50');
      expect(banner?.className).toContain('border-indigo-200');
    });
  });

  describe('Data Source Display', () => {
    it('displays data source when selected', () => {
      renderWithContext('deploy', {
        selectedSource: {
          name: 'Defect Detection Dataset',
          fullPath: 'catalog.schema.table',
          type: 'table',
        },
      });

      expect(screen.getByText('Data Source')).toBeInTheDocument();
      expect(screen.getByText('Defect Detection Dataset')).toBeInTheDocument();
    });

    it('does not display data source section when no source selected', () => {
      renderWithContext('deploy', {
        selectedSource: null,
      });

      expect(screen.queryByText('Data Source')).not.toBeInTheDocument();
    });
  });

  describe('Template Display', () => {
    it('displays template when selected', () => {
      renderWithContext('monitor', {
        selectedTemplate: {
          id: 'template-1',
          name: 'Defect Classification',
          description: 'Classify defect types',
        },
      });

      expect(screen.getByText('Template')).toBeInTheDocument();
      expect(screen.getByText('Defect Classification')).toBeInTheDocument();
    });

    it('does not display template section when no template selected', () => {
      renderWithContext('monitor', {
        selectedTemplate: null,
      });

      expect(screen.queryByText('Template')).not.toBeInTheDocument();
    });

    it('displays both data source and template when both selected', () => {
      renderWithContext('deploy', {
        selectedSource: {
          name: 'Equipment Telemetry',
          fullPath: 'catalog.schema.telemetry',
          type: 'table',
        },
        selectedTemplate: {
          id: 'template-2',
          name: 'Predictive Maintenance',
          description: 'Predict equipment failures',
        },
      });

      expect(screen.getByText('Data Source')).toBeInTheDocument();
      expect(screen.getByText('Equipment Telemetry')).toBeInTheDocument();
      expect(screen.getByText('Template')).toBeInTheDocument();
      expect(screen.getByText('Predictive Maintenance')).toBeInTheDocument();
    });
  });

  describe('Navigation Buttons - Deploy Stage', () => {
    it('displays correct button labels for deploy stage', () => {
      renderWithContext('deploy');

      expect(screen.getByText('Back to Train')).toBeInTheDocument();
      expect(screen.getByText('Continue to Monitor')).toBeInTheDocument();
    });

    it('calls goToPreviousStage when back button clicked on deploy stage', () => {
      renderWithContext('deploy');

      const backButton = screen.getByText('Back to Train');
      fireEvent.click(backButton);

      expect(mockGoToPreviousStage).toHaveBeenCalledOnce();
    });

    it('calls goToNextStage when forward button clicked on deploy stage', () => {
      renderWithContext('deploy');

      const nextButton = screen.getByText('Continue to Monitor');
      fireEvent.click(nextButton);

      expect(mockGoToNextStage).toHaveBeenCalledOnce();
    });
  });

  describe('Navigation Buttons - Monitor Stage', () => {
    it('displays correct button labels for monitor stage', () => {
      renderWithContext('monitor');

      expect(screen.getByText('Back to Deploy')).toBeInTheDocument();
      expect(screen.getByText('Continue to Improve')).toBeInTheDocument();
    });

    it('calls goToPreviousStage when back button clicked on monitor stage', () => {
      renderWithContext('monitor');

      const backButton = screen.getByText('Back to Deploy');
      fireEvent.click(backButton);

      expect(mockGoToPreviousStage).toHaveBeenCalledOnce();
    });

    it('calls goToNextStage when forward button clicked on monitor stage', () => {
      renderWithContext('monitor');

      const nextButton = screen.getByText('Continue to Improve');
      fireEvent.click(nextButton);

      expect(mockGoToNextStage).toHaveBeenCalledOnce();
    });
  });

  describe('Navigation Buttons - Improve Stage', () => {
    it('displays correct button labels for improve stage', () => {
      renderWithContext('improve');

      expect(screen.getByText('Back to Monitor')).toBeInTheDocument();
      expect(screen.getByText('Start New Cycle')).toBeInTheDocument();
    });

    it('calls goToPreviousStage when back button clicked on improve stage', () => {
      renderWithContext('improve');

      const backButton = screen.getByText('Back to Monitor');
      fireEvent.click(backButton);

      expect(mockGoToPreviousStage).toHaveBeenCalledOnce();
    });

    it('calls resetWorkflow and setCurrentStage when Start New Cycle clicked', () => {
      renderWithContext('improve');

      const startNewCycleButton = screen.getByText('Start New Cycle');
      fireEvent.click(startNewCycleButton);

      expect(mockResetWorkflow).toHaveBeenCalledOnce();
      expect(mockSetCurrentStage).toHaveBeenCalledWith('data');
      expect(mockGoToNextStage).not.toHaveBeenCalled();
    });

    it('does not call goToNextStage on improve stage when next button clicked', () => {
      renderWithContext('improve');

      const startNewCycleButton = screen.getByText('Start New Cycle');
      fireEvent.click(startNewCycleButton);

      expect(mockGoToNextStage).not.toHaveBeenCalled();
    });
  });

  describe('Button Accessibility', () => {
    it('back button has proper accessibility attributes', () => {
      renderWithContext('deploy');

      const backButton = screen.getByRole('button', { name: /Back to Train/i });
      expect(backButton).toBeInTheDocument();
      expect(backButton.tagName).toBe('BUTTON');
    });

    it('forward button has proper accessibility attributes', () => {
      renderWithContext('monitor');

      const nextButton = screen.getByRole('button', { name: /Continue to Improve/i });
      expect(nextButton).toBeInTheDocument();
      expect(nextButton.tagName).toBe('BUTTON');
    });

    it('start new cycle button has proper accessibility attributes', () => {
      renderWithContext('improve');

      const startNewCycleButton = screen.getByRole('button', { name: /Start New Cycle/i });
      expect(startNewCycleButton).toBeInTheDocument();
      expect(startNewCycleButton.tagName).toBe('BUTTON');
    });
  });

  describe('Icons', () => {
    it('displays ChevronLeft icon in back button', () => {
      renderWithContext('deploy');

      const backButton = screen.getByText('Back to Train');
      const svg = backButton.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('displays ChevronRight icon in forward button for deploy stage', () => {
      renderWithContext('deploy');

      const nextButton = screen.getByText('Continue to Monitor');
      const svg = nextButton.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('displays ChevronRight icon in forward button for monitor stage', () => {
      renderWithContext('monitor');

      const nextButton = screen.getByText('Continue to Improve');
      const svg = nextButton.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('displays RotateCcw icon in start new cycle button for improve stage', () => {
      renderWithContext('improve');

      const startNewCycleButton = screen.getByText('Start New Cycle');
      const svg = startNewCycleButton.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('displays Database icon when data source is shown', () => {
      renderWithContext('deploy', {
        selectedSource: {
          name: 'Test Dataset',
          fullPath: 'catalog.schema.table',
          type: 'table',
        },
      });

      const dataSourceLabel = screen.getByText('Data Source');
      expect(dataSourceLabel).toBeInTheDocument();
      const dataSourceSection = dataSourceLabel.parentElement?.parentElement;
      const svg = dataSourceSection?.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('displays FileCode icon when template is shown', () => {
      renderWithContext('monitor', {
        selectedTemplate: {
          id: 'template-1',
          name: 'Test Template',
        },
      });

      const templateLabel = screen.getByText('Template');
      expect(templateLabel).toBeInTheDocument();
      const templateSection = templateLabel.parentElement?.parentElement;
      const svg = templateSection?.querySelector('svg');
      expect(svg).toBeTruthy();
    });
  });

  describe('Button Styling', () => {
    it('applies correct hover classes to back button on deploy stage', () => {
      renderWithContext('deploy');

      const backButton = screen.getByText('Back to Train');
      expect(backButton.className).toContain('hover:bg-cyan-100');
    });

    it('applies correct hover classes to back button on monitor stage', () => {
      renderWithContext('monitor');

      const backButton = screen.getByText('Back to Deploy');
      expect(backButton.className).toContain('hover:bg-rose-100');
    });

    it('applies correct hover classes to back button on improve stage', () => {
      renderWithContext('improve');

      const backButton = screen.getByText('Back to Monitor');
      expect(backButton.className).toContain('hover:bg-indigo-100');
    });

    it('applies correct background and hover classes to next button on deploy stage', () => {
      renderWithContext('deploy');

      const nextButton = screen.getByText('Continue to Monitor');
      expect(nextButton.className).toContain('bg-cyan-600');
      expect(nextButton.className).toContain('hover:bg-cyan-700');
    });

    it('applies correct background and hover classes to next button on monitor stage', () => {
      renderWithContext('monitor');

      const nextButton = screen.getByText('Continue to Improve');
      expect(nextButton.className).toContain('bg-rose-600');
      expect(nextButton.className).toContain('hover:bg-rose-700');
    });

    it('applies correct background and hover classes to start new cycle button on improve stage', () => {
      renderWithContext('improve');

      const startNewCycleButton = screen.getByText('Start New Cycle');
      expect(startNewCycleButton.className).toContain('bg-indigo-600');
      expect(startNewCycleButton.className).toContain('hover:bg-indigo-700');
    });
  });
});
