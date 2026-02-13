/**
 * Canonical Label Modal
 *
 * Modal wrapper for the CanonicalLabelingTool
 */

import { CanonicalLabelingTool } from "./CanonicalLabelingTool";

interface CanonicalLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CanonicalLabelModal({
  isOpen,
  onClose,
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
      <div className="relative bg-white rounded-lg shadow-2xl max-w-7xl w-full mx-4 max-h-[95vh] overflow-hidden">
        {/* Content - CanonicalLabelingTool handles its own header */}
        <CanonicalLabelingTool onClose={onClose} />
      </div>
    </div>
  );
}
