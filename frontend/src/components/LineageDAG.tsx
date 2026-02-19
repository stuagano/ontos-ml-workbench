/**
 * LineageDAG — SVG-based lineage visualization
 *
 * Renders the data flow: Sheet → Template → Training Sheet → Model
 * with optional canonical label and Q&A pair counts.
 */

import { Database, FileText, GitBranch, Zap, Tag } from "lucide-react";
import type { TrainingJobLineage } from "../types";

interface LineageDAGProps {
  lineage: TrainingJobLineage;
  modelName: string;
}

interface DAGNode {
  id: string;
  label: string;
  sublabel: string;
  type: "sheet" | "template" | "training_sheet" | "model" | "labels";
  x: number;
  y: number;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 64;
const VERTICAL_GAP = 48;
const CENTER_X = 250;
const LABEL_BRANCH_X = 430;

const typeStyles: Record<
  DAGNode["type"],
  { bg: string; border: string; iconBg: string; iconColor: string }
> = {
  sheet: {
    bg: "#EFF6FF",
    border: "#93C5FD",
    iconBg: "#DBEAFE",
    iconColor: "#2563EB",
  },
  template: {
    bg: "#FFF7ED",
    border: "#FDBA74",
    iconBg: "#FED7AA",
    iconColor: "#EA580C",
  },
  training_sheet: {
    bg: "#F0FDF4",
    border: "#86EFAC",
    iconBg: "#BBF7D0",
    iconColor: "#16A34A",
  },
  model: {
    bg: "#FAF5FF",
    border: "#C084FC",
    iconBg: "#E9D5FF",
    iconColor: "#7C3AED",
  },
  labels: {
    bg: "#FFFBEB",
    border: "#FCD34D",
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
  },
};

function NodeIcon({ type }: { type: DAGNode["type"] }) {
  const size = 16;
  switch (type) {
    case "sheet":
      return <Database size={size} />;
    case "template":
      return <FileText size={size} />;
    case "training_sheet":
      return <GitBranch size={size} />;
    case "model":
      return <Zap size={size} />;
    case "labels":
      return <Tag size={size} />;
  }
}

function DAGNodeBox({ node }: { node: DAGNode }) {
  const style = typeStyles[node.type];
  return (
    <foreignObject
      x={node.x - NODE_WIDTH / 2}
      y={node.y}
      width={NODE_WIDTH}
      height={NODE_HEIGHT}
    >
      <div
        style={{
          background: style.bg,
          border: `1.5px solid ${style.border}`,
          borderRadius: 10,
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          height: NODE_HEIGHT,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: style.iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: style.iconColor,
          }}
        >
          <NodeIcon type={node.type} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#374151",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            {node.label}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#6B7280",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 120,
            }}
            title={node.sublabel}
          >
            {node.sublabel}
          </div>
        </div>
      </div>
    </foreignObject>
  );
}

function Arrow({
  x1,
  y1,
  x2,
  y2,
  curved,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  curved?: boolean;
}) {
  const markerEnd = "url(#arrowhead)";
  if (curved) {
    const midY = (y1 + y2) / 2;
    const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
    return (
      <path
        d={d}
        fill="none"
        stroke="#CBD5E1"
        strokeWidth={1.5}
        markerEnd={markerEnd}
      />
    );
  }
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="#CBD5E1"
      strokeWidth={1.5}
      markerEnd={markerEnd}
    />
  );
}

export function LineageDAG({ lineage, modelName }: LineageDAGProps) {
  // Build nodes from lineage data
  const nodes: DAGNode[] = [];
  let y = 16;

  // Sheet node
  if (lineage.sheet) {
    nodes.push({
      id: "sheet",
      label: "Sheet",
      sublabel: lineage.sheet.name || lineage.sheet.id,
      type: "sheet",
      x: CENTER_X,
      y,
    });
    y += NODE_HEIGHT + VERTICAL_GAP;
  }

  // Template node
  if (lineage.template) {
    nodes.push({
      id: "template",
      label: "Template",
      sublabel: lineage.template.name || lineage.template.id,
      type: "template",
      x: CENTER_X,
      y,
    });
    y += NODE_HEIGHT + VERTICAL_GAP;
  }

  // Canonical labels (branch node)
  const hasLabels =
    lineage.canonical_label_ids && lineage.canonical_label_ids.length > 0;
  const labelNodeY = y;

  // Training Sheet node
  nodes.push({
    id: "training_sheet",
    label: "Training Sheet",
    sublabel: lineage.training_sheet
      ? lineage.training_sheet.name ||
        `${lineage.training_sheet.total_rows ?? "?"} Q&A pairs`
      : lineage.training_sheet_id?.slice(0, 16) + "..." || "—",
    type: "training_sheet",
    x: CENTER_X,
    y,
  });

  if (hasLabels) {
    nodes.push({
      id: "labels",
      label: "Canonical Labels",
      sublabel: `${lineage.canonical_label_ids.length} labels`,
      type: "labels",
      x: LABEL_BRANCH_X,
      y: labelNodeY,
    });
  }

  y += NODE_HEIGHT + VERTICAL_GAP;

  // Model node
  nodes.push({
    id: "model",
    label: "Model",
    sublabel: modelName,
    type: "model",
    x: CENTER_X,
    y,
  });

  const svgHeight = y + NODE_HEIGHT + 24;
  const svgWidth = hasLabels ? 540 : 500;

  // Build edges
  const edges: Array<{
    from: string;
    to: string;
    curved?: boolean;
  }> = [];
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  if (nodeMap.sheet && nodeMap.template) {
    edges.push({ from: "sheet", to: "template" });
  }
  if (nodeMap.template && nodeMap.training_sheet) {
    edges.push({ from: "template", to: "training_sheet" });
  } else if (nodeMap.sheet && nodeMap.training_sheet && !nodeMap.template) {
    edges.push({ from: "sheet", to: "training_sheet" });
  }
  if (nodeMap.labels && nodeMap.training_sheet) {
    edges.push({ from: "labels", to: "training_sheet", curved: true });
  }
  if (nodeMap.training_sheet && nodeMap.model) {
    edges.push({ from: "training_sheet", to: "model" });
  }

  return (
    <div className="bg-white border border-db-gray-200 rounded-lg p-4">
      <h3 className="font-medium text-db-gray-900 mb-3">Data Lineage</h3>
      <svg width={svgWidth} height={svgHeight} className="mx-auto block">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#CBD5E1" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((e, i) => {
          const from = nodeMap[e.from];
          const to = nodeMap[e.to];
          if (!from || !to) return null;
          return (
            <Arrow
              key={i}
              x1={from.x}
              y1={from.y + NODE_HEIGHT}
              x2={to.x}
              y2={to.y}
              curved={e.curved}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => (
          <DAGNodeBox key={node.id} node={node} />
        ))}

        {/* Stats annotation */}
        {lineage.qa_pair_ids && lineage.qa_pair_ids.length > 0 && (
          <text
            x={CENTER_X + NODE_WIDTH / 2 + 12}
            y={
              (nodeMap.training_sheet?.y ?? 0) + NODE_HEIGHT / 2 + 4
            }
            fontSize={11}
            fill="#9CA3AF"
          >
            {lineage.qa_pair_ids.length} pairs
          </text>
        )}
      </svg>
    </div>
  );
}
