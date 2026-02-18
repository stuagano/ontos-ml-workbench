/**
 * Pagination - Reusable pagination component with page navigation
 */

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { clsx } from 'clsx';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  showPageSize?: boolean;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  showPageSize = false,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  // Generate page numbers to show
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate range around current page
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if at edges
      if (currentPage <= 3) {
        end = maxVisible - 1;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - maxVisible + 2;
      }

      // Add ellipsis and middle pages
      if (start > 2) {
        pages.push('ellipsis');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('ellipsis');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalItems === 0 || totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3">
      {/* Info text */}
      <div className="text-sm text-db-gray-500">
        Showing <span className="font-medium">{startItem}</span> to{' '}
        <span className="font-medium">{endItem}</span> of{' '}
        <span className="font-medium">{totalItems}</span> items
      </div>

      <div className="flex items-center gap-4">
        {/* Page size selector */}
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-db-gray-500">Show</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 text-sm border border-db-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        )}

        {/* Page navigation */}
        <nav className="flex items-center gap-1" aria-label="Pagination">
          {/* First page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={!canGoPrev}
            className={clsx(
              'p-1.5 rounded transition-colors',
              canGoPrev
                ? 'text-db-gray-600 hover:bg-db-gray-100'
                : 'text-db-gray-300 cursor-not-allowed'
            )}
            title="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Previous page */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrev}
            className={clsx(
              'p-1.5 rounded transition-colors',
              canGoPrev
                ? 'text-db-gray-600 hover:bg-db-gray-100'
                : 'text-db-gray-300 cursor-not-allowed'
            )}
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-0.5 mx-1">
            {getPageNumbers().map((pageNum, idx) => (
              pageNum === 'ellipsis' ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-db-gray-400">
                  …
                </span>
              ) : (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={clsx(
                    'min-w-[32px] h-8 px-2 text-sm font-medium rounded transition-colors',
                    pageNum === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'text-db-gray-600 hover:bg-db-gray-100'
                  )}
                >
                  {pageNum}
                </button>
              )
            ))}
          </div>

          {/* Next page */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext}
            className={clsx(
              'p-1.5 rounded transition-colors',
              canGoNext
                ? 'text-db-gray-600 hover:bg-db-gray-100'
                : 'text-db-gray-300 cursor-not-allowed'
            )}
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={!canGoNext}
            className={clsx(
              'p-1.5 rounded transition-colors',
              canGoNext
                ? 'text-db-gray-600 hover:bg-db-gray-100'
                : 'text-db-gray-300 cursor-not-allowed'
            )}
            title="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </nav>
      </div>
    </div>
  );
}
