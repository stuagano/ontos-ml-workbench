/**
 * Canonical Label Modal
 *
 * Modal wrapper for the CanonicalLabelingTool
 */

import React from "react";
import { X } from "lucide-react";
import { CanonicalLabelingTool } from "./CanonicalLabelingTool";

interface CanonicalLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetId: string;
  itemRef: string;
  labeledBy: string;
  defaultLabelType?: string;
  defaultLabelData?: any;
}

export function CanonicalLabelModal({
  isOpen,
  onClose,
  sheetId,
  itemRef,
  labeledBy,
  defaultLabelType,
  defaultLabelData,
}: CanonicalLabelModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">
            Create Canonical Label
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <CanonicalLabelingTool
            sheetId={sheetId}
            itemRef={itemRef}
            labeledBy={labeledBy}
            defaultLabelType={defaultLabelType}
            defaultLabelData={defaultLabelData}
            onSuccess={(labelId) => {
              console.log("Created canonical label:", labelId);
              onClose();
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
