/**
 * SimpleAnnotator - Lightweight canvas-based image annotation component
 *
 * Supports bounding box annotations without external dependencies.
 * This is a simpler alternative to Label Studio that works reliably.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Trash2, RotateCcw } from "lucide-react";

export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
}

export interface SimpleAnnotatorProps {
  imageUrl: string;
  labels: { name: string; color: string }[];
  existingBoxes?: BoundingBox[];
  onAnnotationsChange: (boxes: BoundingBox[]) => void;
  height?: number;
}

export function SimpleAnnotator({
  imageUrl,
  labels,
  existingBoxes = [],
  onAnnotationsChange,
  height = 500,
}: SimpleAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [boxes, setBoxes] = useState<BoundingBox[]>(existingBoxes);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<Partial<BoundingBox> | null>(
    null,
  );
  const [selectedLabel, setSelectedLabel] = useState(labels[0]?.name || "");
  const [scale, setScale] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Reset boxes when existingBoxes prop changes (e.g., navigating to new image)
  useEffect(() => {
    setBoxes(existingBoxes);
  }, [existingBoxes]);

  // Reset state when image URL changes (navigating to different image)
  useEffect(() => {
    setImageLoaded(false);
    setImageError(null);
    setImage(null);
    setCurrentBox(null);
    setIsDrawing(false);
  }, [imageUrl]);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      setImageLoaded(true);
      setImageError(null);
    };
    img.onerror = () => {
      setImageError("Failed to load image. It may be blocked by CORS policy.");
      setImageLoaded(false);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Calculate scale when image loads
  useEffect(() => {
    if (!image) return;
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth || 600;
    const scaleX = containerWidth / image.width;
    const scaleY = height / image.height;
    const newScale = Math.min(scaleX, scaleY, 1);
    setScale(newScale);
  }, [image, height]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !image || scale === 0) return;

    canvas.width = image.width * scale;
    canvas.height = image.height * scale;

    // Draw image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Draw existing boxes
    boxes.forEach((box) => {
      ctx.strokeStyle = box.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        box.x * scale,
        box.y * scale,
        box.width * scale,
        box.height * scale,
      );

      // Draw label
      ctx.fillStyle = box.color;
      ctx.font = "12px sans-serif";
      const labelWidth = ctx.measureText(box.label).width + 8;
      ctx.fillRect(box.x * scale, box.y * scale - 18, labelWidth, 18);
      ctx.fillStyle = "white";
      ctx.fillText(box.label, box.x * scale + 4, box.y * scale - 5);
    });

    // Draw current box being drawn
    if (currentBox && currentBox.width && currentBox.height) {
      const label = labels.find((l) => l.name === selectedLabel);
      ctx.strokeStyle = label?.color || "#ef4444";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        currentBox.x! * scale,
        currentBox.y! * scale,
        currentBox.width * scale,
        currentBox.height * scale,
      );
      ctx.setLineDash([]);
    }
  }, [image, boxes, currentBox, scale, selectedLabel, labels]);

  const getMousePos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / scale,
        y: (e.clientY - rect.top) / scale,
      };
    },
    [scale],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getMousePos(e);
      setIsDrawing(true);
      setStartPos(pos);
      setCurrentBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
    },
    [getMousePos],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;

      const pos = getMousePos(e);
      setCurrentBox({
        x: Math.min(startPos.x, pos.x),
        y: Math.min(startPos.y, pos.y),
        width: Math.abs(pos.x - startPos.x),
        height: Math.abs(pos.y - startPos.y),
      });
    },
    [isDrawing, startPos, getMousePos],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentBox) return;

    // Only add box if it has meaningful size
    if (currentBox.width! > 10 && currentBox.height! > 10) {
      const label = labels.find((l) => l.name === selectedLabel);
      const newBox: BoundingBox = {
        id: `box-${Date.now()}`,
        x: currentBox.x!,
        y: currentBox.y!,
        width: currentBox.width!,
        height: currentBox.height!,
        label: selectedLabel,
        color: label?.color || "#ef4444",
      };
      const newBoxes = [...boxes, newBox];
      setBoxes(newBoxes);
      onAnnotationsChange(newBoxes);
    }

    setIsDrawing(false);
    setCurrentBox(null);
  }, [
    isDrawing,
    currentBox,
    boxes,
    selectedLabel,
    labels,
    onAnnotationsChange,
  ]);

  const deleteBox = useCallback(
    (id: string) => {
      const newBoxes = boxes.filter((b) => b.id !== id);
      setBoxes(newBoxes);
      onAnnotationsChange(newBoxes);
    },
    [boxes, onAnnotationsChange],
  );

  const clearAll = useCallback(() => {
    setBoxes([]);
    onAnnotationsChange([]);
  }, [onAnnotationsChange]);

  const updateBoxLabel = useCallback(
    (id: string, newLabel: string) => {
      const label = labels.find((l) => l.name === newLabel);
      const newBoxes = boxes.map((box) =>
        box.id === id
          ? { ...box, label: newLabel, color: label?.color || box.color }
          : box
      );
      setBoxes(newBoxes);
      onAnnotationsChange(newBoxes);
    },
    [boxes, labels, onAnnotationsChange]
  );

  if (imageError) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 rounded-lg p-8"
        style={{ height }}
      >
        <div className="text-center">
          <p className="text-red-500 mb-2">{imageError}</p>
          <p className="text-sm text-gray-500">URL: {imageUrl}</p>
        </div>
      </div>
    );
  }

  if (!imageLoaded) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 rounded-lg"
        style={{ height }}
      >
        <div className="text-gray-500">Loading image...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Label Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-600">Label:</span>
        {labels.map((label) => (
          <button
            key={label.name}
            onClick={() => setSelectedLabel(label.name)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedLabel === label.name
                ? "ring-2 ring-offset-1"
                : "opacity-70 hover:opacity-100"
            }`}
            style={{
              backgroundColor: label.color + "20",
              color: label.color,
              borderColor: label.color,
            }}
          >
            {label.name}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={clearAll}
          className="flex items-center gap-1 px-2 py-1 text-sm text-gray-500 hover:text-red-500 transition-colors"
          title="Clear all"
        >
          <RotateCcw className="w-4 h-4" />
          Clear
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-crosshair"
        />
      </div>

      {/* Annotations List */}
      {boxes.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-700">
            Annotations ({boxes.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {boxes.map((box, idx) => (
              <div
                key={box.id}
                className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded text-sm"
              >
                <span
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: box.color }}
                />
                <select
                  value={box.label}
                  onChange={(e) => updateBoxLabel(box.id, e.target.value)}
                  className="bg-transparent border-none text-sm font-medium cursor-pointer hover:bg-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  style={{ color: box.color }}
                >
                  {labels.map((label) => (
                    <option key={label.name} value={label.name}>
                      {label.name}
                    </option>
                  ))}
                </select>
                <span className="text-gray-400">#{idx + 1}</span>
                <button
                  onClick={() => deleteBox(box.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <p className="text-xs text-gray-400">
        Click and drag to draw bounding boxes. Select a label first, then draw
        on the image.
      </p>
    </div>
  );
}
