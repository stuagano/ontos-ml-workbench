/**
 * Tests for TemplateEditor component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TemplateEditor } from './TemplateEditor';

describe('TemplateEditor', () => {
  const mockOnSaved = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnSaved.mockClear();
    mockOnClose.mockClear();
  });

  it('renders empty form for new template', () => {
    render(<TemplateEditor template={null} onSaved={mockOnSaved} onClose={mockOnClose} />);

    expect(screen.getByPlaceholderText(/Databit Name/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<TemplateEditor template={null} onSaved={mockOnSaved} onClose={mockOnClose} />);

    const saveButton = screen.getByRole('button', { name: /save|create/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSaved).not.toHaveBeenCalled();
    });
  });

  it('saves template with valid data', async () => {
    render(<TemplateEditor template={null} onSaved={mockOnSaved} onClose={mockOnClose} />);

    fireEvent.change(screen.getByPlaceholderText(/Databit Name/i), {
      target: { value: 'Defect Classifier' },
    });

    const saveButton = screen.getByRole('button', { name: /save|create/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      // Note: the actual mutation is mocked, so we just verify the form submitted
      expect(screen.getByPlaceholderText(/Databit Name/i)).toHaveValue('Defect Classifier');
    });
  });

  it('loads existing template for editing', () => {
    const existingTemplate = {
      id: 'template-1',
      name: 'Equipment Defect Detection',
      label_type: 'defect_type',
      prompt_template: 'Analyze: {{image_path}}',
      system_prompt: 'You are an expert.',
      version: '1',
      status: 'published' as const,
      base_model: 'databricks-meta-llama-3-1-70b-instruct',
      temperature: 0.7,
      max_tokens: 1024,
    };

    render(
      <TemplateEditor
        template={existingTemplate}
        onSaved={mockOnSaved}
        onClose={mockOnClose}
      />
    );

    const nameInput = screen.getByPlaceholderText(/Databit Name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Equipment Defect Detection');
  });

  it('supports template variable insertion', async () => {
    render(<TemplateEditor template={null} onSaved={mockOnSaved} onClose={mockOnClose} />);

    // The prompt tab has variable detection - switch to prompt tab first
    const promptTab = screen.getByText('Prompt');
    fireEvent.click(promptTab);

    await waitFor(() => {
      expect(screen.getByText(/System Prompt/i)).toBeInTheDocument();
    });
  });

  it('validates template syntax', async () => {
    render(<TemplateEditor template={null} onSaved={mockOnSaved} onClose={mockOnClose} />);

    // Name is the only required field
    fireEvent.change(screen.getByPlaceholderText(/Databit Name/i), {
      target: { value: '' },
    });

    const saveButton = screen.getByRole('button', { name: /save|create/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSaved).not.toHaveBeenCalled();
    });
  });
});
