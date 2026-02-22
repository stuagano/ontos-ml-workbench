/**
 * SpatialAnnotationWrapper — bridges AnnotationInterface state with
 * SimpleAnnotator (bounding boxes) and LabelStudioAnnotator (polygons).
 *
 * Reads label classes from the LabelField.options array and converts
 * annotation results to/from the human_labels[field.id] format.
 */

import { useCallback, useMemo } from "react";
import {
  SimpleAnnotator,
  type BoundingBox,
} from "../annotation/SimpleAnnotator";
import { LabelStudioAnnotator } from "../annotation/LabelStudioAnnotator";
import type { LabelField } from "../../types";

// Default palette when field options don't specify colors
const DEFAULT_COLORS = [
  "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
];

interface SpatialAnnotationWrapperProps {
  /** The image URL to annotate (already resolved via resolveImageUrl) */
  imageUrl: string;
  /** Spatial label fields (bounding_box or polygon) from the job schema */
  spatialFields: LabelField[];
  /** Current labels state from AnnotationInterface */
  labels: Record<string, unknown>;
  /** Callback to merge spatial data back into labels state */
  onAnnotationsChange: (fieldId: string, value: unknown) => void;
}

export function SpatialAnnotationWrapper({
  imageUrl,
  spatialFields,
  labels,
  onAnnotationsChange,
}: SpatialAnnotationWrapperProps) {
  // Build label classes from the first spatial field's options
  const primaryField = spatialFields[0];

  const labelClasses = useMemo(() => {
    const options = primaryField?.options || ["default"];
    return options.map((name, i) => ({
      name,
      color: DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    }));
  }, [primaryField?.options]);

  // --- Bounding Box mode (SimpleAnnotator) ---
  const handleBboxChange = useCallback(
    (boxes: BoundingBox[]) => {
      if (!primaryField) return;
      // Store as array of box objects (without the color field — that's UI-only)
      const value = boxes.map((b) => ({
        id: b.id,
        x: Math.round(b.x),
        y: Math.round(b.y),
        width: Math.round(b.width),
        height: Math.round(b.height),
        label: b.label,
      }));
      onAnnotationsChange(primaryField.id, value);
    },
    [primaryField, onAnnotationsChange],
  );

  // Convert stored label data back to BoundingBox[] for the annotator
  const existingBoxes: BoundingBox[] = useMemo(() => {
    if (!primaryField) return [];
    const raw = labels[primaryField.id];
    if (!Array.isArray(raw)) return [];
    return raw.map((b: Record<string, unknown>) => ({
      id: String(b.id || `box-${Math.random()}`),
      x: Number(b.x || 0),
      y: Number(b.y || 0),
      width: Number(b.width || 0),
      height: Number(b.height || 0),
      label: String(b.label || labelClasses[0]?.name || "default"),
      color:
        labelClasses.find((lc) => lc.name === b.label)?.color ||
        DEFAULT_COLORS[0],
    }));
  }, [primaryField, labels, labelClasses]);

  // --- Polygon mode (LabelStudioAnnotator) ---
  const handlePolygonSubmit = useCallback(
    (annotation: { id: string | number; result: unknown[] }) => {
      if (!primaryField) return;
      onAnnotationsChange(primaryField.id, annotation.result);
    },
    [primaryField, onAnnotationsChange],
  );

  if (!primaryField) return null;

  // Render the appropriate annotator
  if (primaryField.field_type === "bounding_box") {
    return (
      <div className="spatial-annotation-wrapper h-full flex flex-col">
        <SimpleAnnotator
          imageUrl={imageUrl}
          labels={labelClasses}
          existingBoxes={existingBoxes}
          onAnnotationsChange={handleBboxChange}
        />
      </div>
    );
  }

  if (primaryField.field_type === "polygon") {
    return (
      <div className="spatial-annotation-wrapper h-full flex flex-col">
        <LabelStudioAnnotator
          imageUrl={imageUrl}
          annotationType="polygon"
          labels={labelClasses}
          onSubmit={handlePolygonSubmit}
          height="100%"
        />
      </div>
    );
  }

  return null;
}
