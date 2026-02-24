import { useState, useEffect, useCallback } from "react";
import ReactFlow, {
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from "reactflow";
import type { NodeMouseHandler } from "reactflow";
import "reactflow/dist/style.css";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Network, Brain } from "lucide-react";

import ConceptNode from "./ConceptNode";
import AssetNode from "./AssetNode";
import LineageNode from "./LineageNode";
import type { LineageNodeData } from "./LineageNode";
import NodeDetailsPanel from "./NodeDetailsPanel";
import LineageDetailsPanel from "./LineageDetailsPanel";
import { useSemanticGraphLayout, useLineageGraphLayout } from "./useSemanticGraphLayout";
import { getLineageGraph, materializeLineage } from "../../services/governance";
import type { SemanticModel } from "../../types/governance";

const nodeTypes = {
  conceptNode: ConceptNode,
  assetNode: AssetNode,
  lineageNode: LineageNode,
};

type ViewMode = "concepts" | "lineage";

interface UnifiedGraphViewProps {
  model: SemanticModel;
}

export default function UnifiedGraphView({ model }: UnifiedGraphViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("concepts");
  const queryClient = useQueryClient();

  // Concept graph layout (original)
  const { nodes: conceptNodes, edges: conceptEdges } = useSemanticGraphLayout(model);

  // Lineage graph data + layout
  const lineageQuery = useQuery({
    queryKey: ["lineage-graph"],
    queryFn: getLineageGraph,
    enabled: viewMode === "lineage",
  });

  const { nodes: lineageNodes, edges: lineageEdges } = useLineageGraphLayout(
    lineageQuery.data ?? null,
  );

  const materializeMutation = useMutation({
    mutationFn: materializeLineage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lineage-graph"] });
    },
  });

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedConceptNodeId, setSelectedConceptNodeId] = useState<string | null>(null);
  const [selectedLineageNode, setSelectedLineageNode] = useState<LineageNodeData | null>(null);

  // Update nodes/edges when layout changes
  useEffect(() => {
    if (viewMode === "concepts") {
      setNodes(conceptNodes);
      setEdges(conceptEdges);
    } else {
      setNodes(lineageNodes);
      setEdges(lineageEdges);
    }
    setSelectedConceptNodeId(null);
    setSelectedLineageNode(null);
  }, [viewMode, conceptNodes, conceptEdges, lineageNodes, lineageEdges, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (viewMode === "concepts") {
        setSelectedConceptNodeId((prev) => (prev === node.id ? null : node.id));
        setSelectedLineageNode(null);
      } else {
        const data = node.data as LineageNodeData;
        setSelectedLineageNode((prev) =>
          prev?.entityId === data.entityId ? null : data,
        );
        setSelectedConceptNodeId(null);
      }
    },
    [viewMode],
  );

  const onPaneClick = useCallback(() => {
    setSelectedConceptNodeId(null);
    setSelectedLineageNode(null);
  }, []);

  const hasConcepts = (model.concepts ?? []).length > 0;
  const hasLinks = (model.links ?? []).length > 0;
  const isEmpty = viewMode === "concepts"
    ? !hasConcepts && !hasLinks
    : !lineageQuery.data || lineageQuery.data.nodes.length === 0;

  return (
    <div className="space-y-3">
      {/* View mode toggle + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("concepts")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === "concepts"
                ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            Business Concepts
          </button>
          <button
            onClick={() => setViewMode("lineage")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === "lineage"
                ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            Data Lineage
          </button>
        </div>

        {viewMode === "lineage" && (
          <button
            onClick={() => materializeMutation.mutate()}
            disabled={materializeMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-950 dark:text-teal-400 dark:hover:bg-teal-900 disabled:opacity-50 transition-colors"
          >
            {materializeMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {materializeMutation.isPending ? "Materializing..." : "Refresh Lineage"}
          </button>
        )}
      </div>

      {/* Materialization result toast */}
      {materializeMutation.isSuccess && materializeMutation.data && (
        <div className="px-3 py-2 text-xs bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 rounded-md">
          Materialized {materializeMutation.data.edges_created} edges in{" "}
          {Math.round(materializeMutation.data.duration_ms)}ms
        </div>
      )}

      {/* Graph */}
      <div className="h-[500px] relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {viewMode === "lineage" && lineageQuery.isLoading ? (
          <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800/50">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : isEmpty ? (
          <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800/50">
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {viewMode === "concepts"
                  ? "No concepts or links defined yet."
                  : "No lineage data. Click \"Refresh Lineage\" to materialize."}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-600">
                {viewMode === "concepts"
                  ? "Add business concepts and semantic links to see the knowledge graph."
                  : "Lineage edges are materialized from training sheets, models, and endpoints."}
              </p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Controls position="bottom-left" />
            <MiniMap
              position="bottom-right"
              nodeStrokeWidth={2}
              pannable
              zoomable
              className="!bg-gray-50 dark:!bg-gray-800"
            />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
          </ReactFlow>
        )}

        {/* Detail panels */}
        {viewMode === "concepts" && (
          <NodeDetailsPanel
            selectedNodeId={selectedConceptNodeId}
            model={model}
            onClose={() => setSelectedConceptNodeId(null)}
          />
        )}
        {viewMode === "lineage" && (
          <LineageDetailsPanel
            node={selectedLineageNode}
            onClose={() => setSelectedLineageNode(null)}
          />
        )}
      </div>
    </div>
  );
}
