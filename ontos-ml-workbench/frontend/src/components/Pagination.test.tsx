/**
 * Tests for Pagination component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    totalItems: 50,
    pageSize: 10,
    onPageChange: vi.fn(),
  };

  it('renders nothing when totalItems is 0', () => {
    const { container } = render(
      <Pagination {...defaultProps} totalItems={0} totalPages={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when there is only one page', () => {
    const { container } = render(
      <Pagination {...defaultProps} totalPages={1} totalItems={5} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('displays correct item range', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('calls onPageChange when clicking next', () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />);

    // Click next button (title="Next page")
    const nextButton = screen.getByTitle('Next page');
    fireEvent.click(nextButton);

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange when clicking a page number', () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />);

    // Click page 3
    fireEvent.click(screen.getByText('3'));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('disables previous buttons on first page', () => {
    render(<Pagination {...defaultProps} currentPage={1} />);

    const firstButton = screen.getByTitle('First page');
    const prevButton = screen.getByTitle('Previous page');

    expect(firstButton).toBeDisabled();
    expect(prevButton).toBeDisabled();
  });

  it('disables next buttons on last page', () => {
    render(<Pagination {...defaultProps} currentPage={5} />);

    const nextButton = screen.getByTitle('Next page');
    const lastButton = screen.getByTitle('Last page');

    expect(nextButton).toBeDisabled();
    expect(lastButton).toBeDisabled();
  });

  it('shows page size selector when showPageSize is true', () => {
    const onPageSizeChange = vi.fn();
    render(
      <Pagination
        {...defaultProps}
        showPageSize
        onPageSizeChange={onPageSizeChange}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('10');
  });

  it('calls onPageSizeChange when selecting new page size', () => {
    const onPageSizeChange = vi.fn();
    render(
      <Pagination
        {...defaultProps}
        showPageSize
        onPageSizeChange={onPageSizeChange}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '25' } });

    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it('highlights current page', () => {
    render(<Pagination {...defaultProps} currentPage={3} />);

    const currentPageButton = screen.getByText('3');
    expect(currentPageButton).toHaveClass('bg-blue-600', 'text-white');
  });
});
