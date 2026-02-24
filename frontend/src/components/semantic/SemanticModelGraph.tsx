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

import ConceptNode from "./ConceptNode";
import AssetNode from "./AssetNode";
import NodeDetailsPanel from "./NodeDetailsPanel";
import { useSemanticGraphLayout } from "./useSemanticGraphLayout";
import type { SemanticModel } from "../../types/governance";

const nodeTypes = {
  conceptNode: ConceptNode,
  assetNode: AssetNode,
};

interface SemanticModelGraphProps {
  model: SemanticModel;
}

export default function SemanticModelGraph({ model }: SemanticModelGraphProps) {
  const { nodes: layoutNodes, edges: layoutEdges } = useSemanticGraphLayout(model);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Re-layout when model changes
  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
    setSelectedNodeId(null);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const hasConcepts = (model.concepts ?? []).length > 0;
  const hasLinks = (model.links ?? []).length > 0;

  if (!hasConcepts && !hasLinks) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">No concepts or links defined yet.</p>
          <p className="text-xs text-gray-400 dark:text-gray-600">Add business concepts and semantic links to see the knowledge graph.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[500px] relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
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
      <NodeDetailsPanel
        selectedNodeId={selectedNodeId}
        model={model}
        onClose={() => setSelectedNodeId(null)}
      />
    </div>
  );
}
