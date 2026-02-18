/**
 * Tests for LabelsetForm component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LabelsetForm } from './LabelsetForm';

describe('LabelsetForm', () => {
  const mockOnSaved = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnSaved.mockClear();
    mockOnCancel.mockClear();
  });

  it('renders form fields', () => {
    render(<LabelsetForm onSaved={mockOnSaved} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/label type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save|create/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<LabelsetForm onSaved={mockOnSaved} onCancel={mockOnCancel} />);

    const submitButton = screen.getByRole('button', { name: /save|create/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSaved).not.toHaveBeenCalled();
    });
  });

  it('submits form with valid data', async () => {
    render(<LabelsetForm onSaved={mockOnSaved} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText(/name/i);
    const labelTypeInput = screen.getByLabelText(/label type/i);

    fireEvent.change(nameInput, { target: { value: 'Defect Types' } });
    fireEvent.change(labelTypeInput, { target: { value: 'defect_type' } });

    const submitButton = screen.getByRole('button', { name: /save|create/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Defect Types',
          label_type: 'defect_type',
        })
      );
    });
  });

  it('calls onCancel when cancel button clicked', () => {
    render(<LabelsetForm onSaved={mockOnSaved} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledOnce();
  });

  it('populates form when editing existing labelset', () => {
    const existingLabelset = {
      id: 'labelset-1',
      name: 'Equipment Defects',
      label_type: 'defect_type',
      label_classes: [
        { name: 'crack', color: '#ef4444' },
        { name: 'corrosion', color: '#f59e0b' },
        { name: 'wear', color: '#eab308' },
      ],
      canonical_label_count: 0,
      status: 'published' as const,
      version: '1',
    };

    render(
      <LabelsetForm
        labelset={existingLabelset}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Equipment Defects');
  });

  it('adds label classes dynamically', async () => {
    render(<LabelsetForm onSaved={mockOnSaved} onCancel={mockOnCancel} />);

    const addClassButton = screen.getByRole('button', { name: /add class|add label/i });
    fireEvent.click(addClassButton);

    await waitFor(() => {
      const classInputs = screen.getAllByPlaceholderText(/class|label/i);
      expect(classInputs.length).toBeGreaterThan(0);
    });
  });
});
