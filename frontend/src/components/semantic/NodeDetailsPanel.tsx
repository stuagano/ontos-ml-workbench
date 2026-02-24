import { X, Box, Database, Hash, FileText, FileCheck, Package } from "lucide-react";
import type { SemanticModel, ConceptType } from "../../types/governance";

const CONCEPT_TYPE_LABELS: Record<ConceptType, string> = {
  entity: "Entity",
  event: "Event",
  metric: "Metric",
  dimension: "Dimension",
};

const CONCEPT_TYPE_COLORS: Record<ConceptType, string> = {
  entity: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  event: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  metric: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  dimension: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
};

const LINK_TYPE_LABELS: Record<string, string> = {
  maps_to: "Maps To",
  derived_from: "Derived From",
  aggregates: "Aggregates",
  represents: "Represents",
};

const ASSET_ICONS: Record<string, typeof Database> = {
  table: Database,
  column: Hash,
  sheet: FileText,
  contract: FileCheck,
  product: Package,
};

interface NodeDetailsPanelProps {
  selectedNodeId: string | null;
  model: SemanticModel;
  onClose: () => void;
}

export default function NodeDetailsPanel({ selectedNodeId, model, onClose }: NodeDetailsPanelProps) {
  if (!selectedNodeId) return null;

  const concepts = model.concepts ?? [];
  const links = model.links ?? [];

  // Build property→concept lookup
  const propertyToConceptMap = new Map<string, string>();
  for (const c of concepts) {
    for (const p of c.properties ?? []) {
      propertyToConceptMap.set(p.id, c.id);
    }
  }

  // Check if it's a concept node
  const concept = concepts.find((c) => c.id === selectedNodeId);
  if (concept) {
    const outgoingLinks = links.filter((l) => {
      if (l.source_type === "concept") return l.source_id === concept.id;
      return propertyToConceptMap.get(l.source_id) === concept.id;
    });

    return (
      <div className="absolute top-0 right-0 w-80 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-lg overflow-y-auto z-10">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold text-sm text-gray-800 dark:text-white">Concept</span>
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white">{concept.name}</h3>
            <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded font-medium ${CONCEPT_TYPE_COLORS[concept.concept_type]}`}>
              {CONCEPT_TYPE_LABELS[concept.concept_type]}
            </span>
          </div>

          {concept.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{concept.description}</p>
          )}

          {(concept.properties ?? []).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Properties ({concept.properties.length})
              </h4>
              <div className="space-y-1">
                {concept.properties.map((prop) => (
                  <div key={prop.id} className="flex items-center gap-2 py-1 px-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                    <Hash className="w-3 h-3 text-gray-400" />
                    <span className="font-medium text-gray-700 dark:text-gray-300">{prop.name}</span>
                    {prop.data_type && <span className="text-gray-400">{prop.data_type}</span>}
                    {prop.is_required && <span className="text-red-500 text-[10px]">req</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {outgoingLinks.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Outgoing Links ({outgoingLinks.length})
              </h4>
              <div className="space-y-1">
                {outgoingLinks.map((link) => (
                  <div key={link.id} className="py-1.5 px-2 bg-gray-50 dark:bg-gray-800 rounded text-xs space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded font-medium text-[10px]">
                        {LINK_TYPE_LABELS[link.link_type] ?? link.link_type}
                      </span>
                      <span className="text-gray-500">→</span>
                      <span className="text-gray-700 dark:text-gray-300 truncate">
                        {link.target_name ?? link.target_id?.substring(0, 8)}
                      </span>
                    </div>
                    {link.confidence != null && (
                      <div className="flex items-center gap-1">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                          <div
                            className="bg-indigo-500 h-1 rounded-full"
                            style={{ width: `${link.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400">{(link.confidence * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // It's an asset node (id format: "asset:type:name")
  if (selectedNodeId.startsWith("asset:")) {
    const parts = selectedNodeId.split(":");
    const targetType = parts[1];
    const targetName = parts.slice(2).join(":");
    const Icon = ASSET_ICONS[targetType] ?? Database;

    const incomingLinks = links.filter((l) => {
      const tName = l.target_name ?? l.target_id ?? "unknown";
      return l.target_type === targetType && tName === targetName;
    });

    return (
      <div className="absolute top-0 right-0 w-80 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-lg overflow-y-auto z-10">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-sm text-gray-800 dark:text-white">Data Asset</span>
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white break-all">{targetName}</h3>
            <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
              {targetType}
            </span>
          </div>

          {incomingLinks.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Incoming Links ({incomingLinks.length})
              </h4>
              <div className="space-y-1">
                {incomingLinks.map((link) => {
                  const sourceConceptId = link.source_type === "concept"
                    ? link.source_id
                    : propertyToConceptMap.get(link.source_id) ?? null;
                  const sourceConcept = sourceConceptId
                    ? concepts.find((c) => c.id === sourceConceptId)
                    : null;

                  return (
                    <div key={link.id} className="py-1.5 px-2 bg-gray-50 dark:bg-gray-800 rounded text-xs space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          {sourceConcept?.name ?? link.source_id.substring(0, 8)}
                        </span>
                        <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded font-medium text-[10px]">
                          {LINK_TYPE_LABELS[link.link_type] ?? link.link_type}
                        </span>
                      </div>
                      {link.confidence != null && (
                        <div className="flex items-center gap-1">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                            <div
                              className="bg-indigo-500 h-1 rounded-full"
                              style={{ width: `${link.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400">{(link.confidence * 100).toFixed(0)}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
