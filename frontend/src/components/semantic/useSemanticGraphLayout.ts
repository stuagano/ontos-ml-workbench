import { useMemo } from "react";
import dagre from "dagre";
import type { Node, Edge } from "reactflow";
import type {
  SemanticModel,
  SemanticLink,
  ConceptType,
  LineageGraph,
  LineageEntityType,
} from "../../types/governance";
import { LINEAGE_FORWARD_TYPES } from "../../types/governance";
import type { LineageNodeData } from "./LineageNode";

export interface ConceptNodeData {
  name: string;
  conceptType: ConceptType;
  propertyCount: number;
  description: string | null;
}

export interface AssetNodeData {
  targetType: string;
  targetName: string;
  linkCount: number;
}

const LINK_TYPE_LABELS: Record<string, string> = {
  maps_to: "Maps To",
  derived_from: "Derived From",
  aggregates: "Aggregates",
  represents: "Represents",
  produces: "Produces",
  trains_on: "Trains On",
  deployed_as: "Deployed As",
  generated_from: "Generated From",
  labeled_by: "Labeled By",
  feeds_into: "Feeds Into",
  produced_by: "Produced By",
  used_to_train: "Used to Train",
  deployment_of: "Deployment Of",
  generates: "Generates",
  labels: "Labels",
  fed_by: "Fed By",
  in_domain: "In Domain",
  domain_contains: "Contains",
  exposes: "Exposes",
  exposed_by: "Exposed By",
  governs: "Governs",
  governed_by: "Governed By",
  targets: "Targets",
  targeted_by: "Targeted By",
  contains_task: "Contains Task",
  task_in: "Task In",
  contains_item: "Contains Item",
  item_in: "Item In",
  evaluated_with: "Evaluated With",
  evaluation_of: "Evaluation Of",
  evaluates_model: "Evaluates Model",
  model_evaluated_by: "Model Evaluated By",
  attributed_to: "Attributed To",
  attributes: "Attributes",
  owned_by_team: "Owned By",
  team_owns: "Owns",
  parent_of: "Parent Of",
  child_of: "Child Of",
  reviews: "Reviews",
  reviewed_by: "Reviewed By",
  identifies_gap: "Identifies Gap",
  gap_found_in: "Gap Found In",
  gap_for_model: "Gap For Model",
  model_has_gap: "Has Gap",
  remediates: "Remediates",
  remediated_by: "Remediated By",
  sourced_from: "Sourced From",
  source_for: "Source For",
  subscribes_to: "Subscribes To",
  subscribed_by: "Subscribed By",
};

const CONCEPT_NODE_WIDTH = 220;
const CONCEPT_NODE_HEIGHT = 80;
const ASSET_NODE_WIDTH = 180;
const ASSET_NODE_HEIGHT = 56;
const LINEAGE_NODE_WIDTH = 220;
const LINEAGE_NODE_HEIGHT = 80;

function assetKey(targetType: string, targetName: string): string {
  return `asset:${targetType}:${targetName}`;
}

function lineageNodeKey(entityType: string, entityId: string): string {
  return `lineage:${entityType}:${entityId}`;
}

/**
 * Resolves a link's source to a concept ID.
 * When source_type is "property", walks the property→concept lookup map.
 */
function resolveSourceConceptId(
  link: SemanticLink,
  propertyToConceptMap: Map<string, string>,
): string | null {
  if (link.source_type === "concept") return link.source_id;
  return propertyToConceptMap.get(link.source_id) ?? null;
}

/**
 * Layout for business-concept semantic models (original behavior).
 */
export function useSemanticGraphLayout(model: SemanticModel | null) {
  return useMemo(() => {
    if (!model) return { nodes: [], edges: [] };

    const concepts = model.concepts ?? [];
    const links = model.links ?? [];

    // Build property→concept lookup
    const propertyToConceptMap = new Map<string, string>();
    for (const concept of concepts) {
      for (const prop of concept.properties ?? []) {
        propertyToConceptMap.set(prop.id, concept.id);
      }
    }

    // Collect unique assets from links
    const assetMap = new Map<string, { targetType: string; targetName: string; linkCount: number }>();
    for (const link of links) {
      const tName = link.target_name ?? link.target_id ?? "unknown";
      const key = assetKey(link.target_type, tName);
      const existing = assetMap.get(key);
      if (existing) {
        existing.linkCount++;
      } else {
        assetMap.set(key, { targetType: link.target_type, targetName: tName, linkCount: 1 });
      }
    }

    // Build dagre graph
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 120 });
    g.setDefaultEdgeLabel(() => ({}));

    // Add concept nodes
    const nodes: Node<ConceptNodeData | AssetNodeData>[] = [];
    for (const concept of concepts) {
      g.setNode(concept.id, { width: CONCEPT_NODE_WIDTH, height: CONCEPT_NODE_HEIGHT });
      nodes.push({
        id: concept.id,
        type: "conceptNode",
        position: { x: 0, y: 0 },
        data: {
          name: concept.name,
          conceptType: concept.concept_type,
          propertyCount: (concept.properties ?? []).length,
          description: concept.description,
        },
      });
    }

    // Add asset nodes
    for (const [key, asset] of assetMap) {
      g.setNode(key, { width: ASSET_NODE_WIDTH, height: ASSET_NODE_HEIGHT });
      nodes.push({
        id: key,
        type: "assetNode",
        position: { x: 0, y: 0 },
        data: {
          targetType: asset.targetType,
          targetName: asset.targetName,
          linkCount: asset.linkCount,
        },
      });
    }

    // Build edges
    const edges: Edge[] = [];

    // Hierarchy edges: parent→child
    for (const concept of concepts) {
      if (concept.parent_id) {
        const parentExists = concepts.some((c) => c.id === concept.parent_id);
        if (parentExists) {
          edges.push({
            id: `hierarchy:${concept.parent_id}:${concept.id}`,
            source: concept.parent_id,
            target: concept.id,
            type: "default",
            style: { stroke: "#9ca3af", strokeDasharray: "6 3", strokeWidth: 1.5 },
            animated: false,
          });
          g.setEdge(concept.parent_id, concept.id);
        }
      }
    }

    // Link edges: concept→asset
    for (const link of links) {
      const sourceConceptId = resolveSourceConceptId(link, propertyToConceptMap);
      if (!sourceConceptId) continue;
      const sourceExists = concepts.some((c) => c.id === sourceConceptId);
      if (!sourceExists) continue;

      const tName = link.target_name ?? link.target_id ?? "unknown";
      const targetKey = assetKey(link.target_type, tName);
      const confidence = link.confidence ?? 0.5;

      edges.push({
        id: `link:${link.id}`,
        source: sourceConceptId,
        target: targetKey,
        type: "default",
        label: LINK_TYPE_LABELS[link.link_type] ?? link.link_type,
        labelStyle: { fontSize: 10, fill: "#6366f1" },
        style: {
          stroke: "#6366f1",
          strokeWidth: 1 + confidence * 2,
          opacity: 0.3 + confidence * 0.7,
        },
        animated: false,
      });
      g.setEdge(sourceConceptId, targetKey);
    }

    // Run dagre layout
    dagre.layout(g);

    // Apply positions
    for (const node of nodes) {
      const pos = g.node(node.id);
      if (pos) {
        const w = node.type === "conceptNode" ? CONCEPT_NODE_WIDTH : ASSET_NODE_WIDTH;
        const h = node.type === "conceptNode" ? CONCEPT_NODE_HEIGHT : ASSET_NODE_HEIGHT;
        node.position = { x: pos.x - w / 2, y: pos.y - h / 2 };
      }
    }

    return { nodes, edges };
  }, [model]);
}

/**
 * Layout for lineage graphs — pipeline entities with stage-based ranking.
 * Only renders forward-direction edges to avoid visual clutter.
 */
export function useLineageGraphLayout(lineageGraph: LineageGraph | null) {
  return useMemo(() => {
    if (!lineageGraph) return { nodes: [], edges: [] };

    const { nodes: lNodes, edges: lEdges } = lineageGraph;
    if (lNodes.length === 0) return { nodes: [], edges: [] };

    // Build dagre graph with stage-based ranking
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 160 });
    g.setDefaultEdgeLabel(() => ({}));

    // Add lineage nodes
    const nodes: Node<LineageNodeData>[] = [];
    const nodeIds = new Set<string>();

    for (const lNode of lNodes) {
      const key = lineageNodeKey(lNode.entity_type, lNode.entity_id);
      if (nodeIds.has(key)) continue;
      nodeIds.add(key);

      g.setNode(key, { width: LINEAGE_NODE_WIDTH, height: LINEAGE_NODE_HEIGHT });
      nodes.push({
        id: key,
        type: "lineageNode",
        position: { x: 0, y: 0 },
        data: {
          entityType: lNode.entity_type as LineageEntityType,
          entityId: lNode.entity_id,
          entityName: lNode.entity_name ?? lNode.entity_id,
          metadata: lNode.metadata ?? null,
        },
      });
    }

    // Only render forward edges to keep the graph clean
    const edges: Edge[] = [];
    for (const lEdge of lEdges) {
      if (!LINEAGE_FORWARD_TYPES.has(lEdge.link_type)) continue;

      const sourceKey = lineageNodeKey(lEdge.source_type, lEdge.source_id);
      const targetKey = lineageNodeKey(lEdge.target_type, lEdge.target_id);

      if (!nodeIds.has(sourceKey) || !nodeIds.has(targetKey)) continue;

      edges.push({
        id: `lineage:${lEdge.source_id}:${lEdge.target_id}:${lEdge.link_type}`,
        source: sourceKey,
        target: targetKey,
        type: "default",
        label: LINK_TYPE_LABELS[lEdge.link_type] ?? lEdge.link_type,
        labelStyle: { fontSize: 10, fill: "#0d9488" },
        style: { stroke: "#0d9488", strokeWidth: 2 },
        animated: true,
      });
      g.setEdge(sourceKey, targetKey);
    }

    // Run dagre layout
    dagre.layout(g);

    // Apply positions
    for (const node of nodes) {
      const pos = g.node(node.id);
      if (pos) {
        node.position = {
          x: pos.x - LINEAGE_NODE_WIDTH / 2,
          y: pos.y - LINEAGE_NODE_HEIGHT / 2,
        };
      }
    }

    return { nodes, edges };
  }, [lineageGraph]);
}
