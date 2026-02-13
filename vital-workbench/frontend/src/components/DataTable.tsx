/**
 * DataTable - Reusable table component for list views (Google Cloud style)
 */

import React, { useState } from "react";
import { ChevronDown, ChevronRight, MoreVertical } from "lucide-react";
import { clsx } from "clsx";

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render: (item: T) => React.ReactNode;
}

export interface RowAction<T> {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (item: T) => void;
  className?: string;
  show?: (item: T) => boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowKey: (item: T) => string;
  onRowClick?: (item: T) => void;
  selectedRows?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  expandedContent?: (item: T) => React.ReactNode;
  rowActions?: RowAction<T>[];
  emptyState?: React.ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  selectedRows = new Set(),
  onSelectionChange,
  expandedContent,
  rowActions,
  emptyState,
}: DataTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Safety check: if data is undefined, default to empty array
  const safeData = data || [];
  const allSelected = safeData.length > 0 && safeData.every((item) => selectedRows.has(rowKey(item)));
  const someSelected = safeData.some((item) => selectedRows.has(rowKey(item))) && !allSelected;

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;

    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(safeData.map((item) => rowKey(item))));
    }
  };

  const toggleRow = (item: T) => {
    if (!onSelectionChange) return;

    const id = rowKey(item);
    const newSelected = new Set(selectedRows);

    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }

    onSelectionChange(newSelected);
  };

  const toggleExpanded = (item: T) => {
    const id = rowKey(item);
    const newExpanded = new Set(expandedRows);

    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }

    setExpandedRows(newExpanded);
  };

  if (safeData.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="bg-white rounded-lg border border-db-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-db-gray-50 border-b border-db-gray-200">
            <tr>
              {onSelectionChange && (
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someSelected;
                    }}
                    onChange={toggleSelectAll}
                    className="rounded border-db-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              {expandedContent && <th className="w-12"></th>}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-xs font-medium text-db-gray-600 uppercase tracking-wider"
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
              {rowActions && <th className="w-12"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-db-gray-200">
            {safeData.map((item) => {
              const id = rowKey(item);
              const isExpanded = expandedRows.has(id);
              const isSelected = selectedRows.has(id);
              const visibleActions = rowActions?.filter(
                (action) => !action.show || action.show(item)
              );

              return (
                <React.Fragment key={id}>
                  <tr
                    className={clsx(
                      "hover:bg-db-gray-50 transition-colors",
                      isSelected && "bg-blue-50",
                      onRowClick && "cursor-pointer"
                    )}
                    onClick={() => onRowClick?.(item)}
                  >
                    {onSelectionChange && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(item)}
                          className="rounded border-db-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    )}
                    {expandedContent && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleExpanded(item)}
                          className="text-db-gray-400 hover:text-db-gray-600"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    )}
                    {columns.map((column) => (
                      <td key={column.key} className="px-4 py-3 text-sm text-db-gray-900">
                        {column.render(item)}
                      </td>
                    ))}
                    {rowActions && visibleActions && visibleActions.length > 0 && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === id ? null : id)}
                            className="text-db-gray-400 hover:text-db-gray-600 p-1 rounded hover:bg-db-gray-100"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openMenuId === id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-db-gray-200 py-1 z-20">
                                {visibleActions.map((action, idx) => {
                                  const Icon = action.icon;
                                  return (
                                    <button
                                      key={idx}
                                      onClick={() => {
                                        action.onClick(item);
                                        setOpenMenuId(null);
                                      }}
                                      className={clsx(
                                        "w-full px-3 py-2 text-left text-sm hover:bg-db-gray-50 flex items-center gap-2",
                                        action.className
                                      )}
                                    >
                                      {Icon && <Icon className="w-4 h-4" />}
                                      {action.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  {isExpanded && expandedContent && (
                    <tr key={`${id}-expanded`}>
                      <td
                        colSpan={
                          columns.length +
                          (onSelectionChange ? 1 : 0) +
                          (expandedContent !== undefined ? 1 : 0) +
                          (rowActions !== undefined ? 1 : 0)
                        }
                        className="px-4 py-3 bg-db-gray-50"
                      >
                        {expandedContent(item)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
