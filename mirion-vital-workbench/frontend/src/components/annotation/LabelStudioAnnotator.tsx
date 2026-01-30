/**
 * LabelStudioAnnotator - Embedded Label Studio Frontend for image annotation
 *
 * Supports:
 * - Bounding boxes (RectangleLabels)
 * - Polygons (PolygonLabels)
 * - Brush/Segmentation masks (BrushLabels)
 * - Image classification (Choices)
 *
 * Uses dynamic CDN loading for Label Studio to avoid build issues
 */

import { useEffect, useRef, useState } from "react";

// Label Studio version to load from CDN
// Note: Using the older 'label-studio' package which has pre-built assets
// The newer @heartexlabs/label-studio package doesn't include build files in npm
const LABEL_STUDIO_VERSION = "1.0.1";
const LABEL_STUDIO_CDN = `https://unpkg.com/label-studio@${LABEL_STUDIO_VERSION}/build/static`;

// Global type declaration for Label Studio
declare global {
  interface Window {
    LabelStudio: any;
  }
}

// ============================================================================
// Types
// ============================================================================

export type AnnotationType = "bbox" | "polygon" | "brush" | "classification";

export interface LabelConfig {
  name: string;
  color?: string;
}

export interface AnnotationResult {
  id: string;
  type: AnnotationType;
  value: Record<string, unknown>;
  from_name: string;
  to_name: string;
}

export interface Annotation {
  id: string | number;
  result: AnnotationResult[];
  created_at?: string;
  updated_at?: string;
}

export interface LabelStudioAnnotatorProps {
  /** Image URL to annotate */
  imageUrl: string;

  /** Type of annotation tool */
  annotationType: AnnotationType;

  /** Label classes available */
  labels: LabelConfig[];

  /** Existing annotations to load */
  existingAnnotations?: Annotation[];

  /** Callback when annotation is submitted */
  onSubmit: (annotation: Annotation) => void;

  /** Callback when annotation is updated */
  onUpdate?: (annotation: Annotation) => void;

  /** Callback when annotation is deleted */
  onDelete?: (annotationId: string | number) => void;

  /** Optional task ID */
  taskId?: string | number;

  /** User info for attribution */
  user?: {
    pk: number;
    firstName: string;
    lastName: string;
  };

  /** Custom CSS class */
  className?: string;

  /** Height of the annotation area */
  height?: string | number;
}

// ============================================================================
// Label Config Builders
// ============================================================================

function buildLabelConfig(
  annotationType: AnnotationType,
  labels: LabelConfig[],
): string {
  const labelElements = labels
    .map(
      (l) =>
        `<Label value="${l.name}"${l.color ? ` background="${l.color}"` : ""}/>`,
    )
    .join("\n        ");

  switch (annotationType) {
    case "bbox":
      return `
<View>
  <Image name="image" value="$image" zoom="true" zoomControl="true" rotateControl="true"/>
  <RectangleLabels name="label" toName="image" strokeWidth="2" opacity="0.8">
    ${labelElements}
  </RectangleLabels>
</View>`;

    case "polygon":
      return `
<View>
  <Image name="image" value="$image" zoom="true" zoomControl="true" rotateControl="true"/>
  <PolygonLabels name="label" toName="image" strokeWidth="2" opacity="0.8">
    ${labelElements}
  </PolygonLabels>
</View>`;

    case "brush":
      return `
<View>
  <Image name="image" value="$image" zoom="true" zoomControl="true" rotateControl="true"/>
  <BrushLabels name="label" toName="image">
    ${labelElements}
  </BrushLabels>
</View>`;

    case "classification":
      return `
<View>
  <Image name="image" value="$image" zoom="true" zoomControl="true"/>
  <Choices name="label" toName="image" choice="single" showInline="true">
    ${labels.map((l) => `<Choice value="${l.name}"/>`).join("\n        ")}
  </Choices>
</View>`;

    default:
      return `
<View>
  <Image name="image" value="$image" zoom="true" zoomControl="true" rotateControl="true"/>
  <RectangleLabels name="label" toName="image" strokeWidth="2" opacity="0.8">
    ${labelElements}
  </RectangleLabels>
</View>`;
  }
}

// ============================================================================
// Component
// ============================================================================

// Track if Label Studio assets are already loaded
let labelStudioLoaded = false;
let labelStudioLoading: Promise<void> | null = null;

/**
 * Load Label Studio CSS and JS from CDN
 */
async function loadLabelStudio(): Promise<void> {
  if (labelStudioLoaded && window.LabelStudio) {
    return;
  }

  if (labelStudioLoading) {
    return labelStudioLoading;
  }

  labelStudioLoading = new Promise((resolve, reject) => {
    // Load CSS
    const existingLink = document.querySelector(`link[href*="label-studio"]`);
    if (!existingLink) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `${LABEL_STUDIO_CDN}/css/main.css`;
      document.head.appendChild(link);
    }

    // Load JS
    const existingScript = document.querySelector(
      `script[src*="label-studio"]`,
    );
    if (existingScript && window.LabelStudio) {
      labelStudioLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = `${LABEL_STUDIO_CDN}/js/main.js`;
    script.async = true;
    script.onload = () => {
      labelStudioLoaded = true;
      resolve();
    };
    script.onerror = () => {
      reject(new Error("Failed to load Label Studio from CDN"));
    };
    document.body.appendChild(script);
  });

  return labelStudioLoading;
}

export function LabelStudioAnnotator({
  imageUrl,
  annotationType,
  labels,
  existingAnnotations = [],
  onSubmit,
  onUpdate,
  onDelete,
  taskId = 1,
  user = { pk: 1, firstName: "Annotator", lastName: "User" },
  className = "",
  height = "600px",
}: LabelStudioAnnotatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelStudioRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Build the label config
  const labelConfig = buildLabelConfig(annotationType, labels);

  // Load Label Studio and initialize
  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!containerRef.current) return;

      try {
        // Load Label Studio from CDN
        await loadLabelStudio();

        if (!mounted || !containerRef.current) return;

        // Clear any existing instance
        if (labelStudioRef.current) {
          try {
            labelStudioRef.current.destroy?.();
          } catch (e) {
            // Ignore cleanup errors
          }
        }

        // Clear the container
        containerRef.current.innerHTML = "";

        // Create new instance
        labelStudioRef.current = new window.LabelStudio(containerRef.current, {
          config: labelConfig,

          interfaces: [
            "panel",
            "update",
            "submit",
            "skip",
            "controls",
            "infobar",
            "topbar",
            "instruction",
            "side-column",
            "annotations:menu",
            "annotations:add-new",
            "annotations:delete",
            "predictions:menu",
          ],

          user,

          task: {
            id: taskId,
            annotations: existingAnnotations,
            predictions: [],
            data: {
              image: imageUrl,
            },
          },

          onLabelStudioLoad: () => {
            if (mounted) {
              setIsReady(true);
              console.log("[LabelStudioAnnotator] Loaded successfully");
            }
          },

          onSubmitAnnotation: (_ls: any, annotation: any) => {
            console.log("[LabelStudioAnnotator] Submit:", annotation);
            const result: Annotation = {
              id: annotation.id || `annotation-${Date.now()}`,
              result: annotation.serializeAnnotation(),
              created_at: new Date().toISOString(),
            };
            onSubmit(result);
          },

          onUpdateAnnotation: (_ls: any, annotation: any) => {
            console.log("[LabelStudioAnnotator] Update:", annotation);
            if (onUpdate) {
              const result: Annotation = {
                id: annotation.id,
                result: annotation.serializeAnnotation(),
                updated_at: new Date().toISOString(),
              };
              onUpdate(result);
            }
          },

          onDeleteAnnotation: (_ls: any, annotation: any) => {
            console.log("[LabelStudioAnnotator] Delete:", annotation);
            if (onDelete) {
              onDelete(annotation.id);
            }
          },

          onSkipTask: () => {
            console.log("[LabelStudioAnnotator] Skip");
          },
        });
      } catch (error) {
        console.error("[LabelStudioAnnotator] Failed to initialize:", error);
        if (mounted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Failed to load annotation tools",
          );
        }
      }
    }

    init();

    // Cleanup
    return () => {
      mounted = false;
      if (labelStudioRef.current) {
        try {
          labelStudioRef.current.destroy?.();
        } catch (e) {
          // Ignore cleanup errors
        }
        labelStudioRef.current = null;
      }
    };
  }, [imageUrl, labelConfig, taskId]);

  return (
    <div
      className={`label-studio-annotator ${className}`}
      style={{ position: "relative" }}
    >
      <div
        ref={containerRef}
        style={{
          height: typeof height === "number" ? `${height}px` : height,
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      />
      {!isReady && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-gray-500">Loading annotation tools...</div>
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50">
          <div className="text-center">
            <div className="text-red-600 font-medium mb-2">
              Failed to load annotation tools
            </div>
            <div className="text-red-500 text-sm">{loadError}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LabelStudioAnnotator;
