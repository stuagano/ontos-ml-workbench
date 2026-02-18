/**
 * UCBrowser - Unity Catalog browser with tree navigation
 *
 * Allows users to browse catalogs, schemas, tables, and volumes
 * with drag-and-drop support for selecting data sources.
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getConfig } from "../services/api";
import {
  ChevronRight,
  ChevronDown,
  Database,
  FolderOpen,
  Table2,
  HardDrive,
  File,
  Loader2,
  ExternalLink,
  GripVertical,
  RefreshCw,
  Search,
} from "lucide-react";
import { clsx } from "clsx";
import {
  listCatalogs,
  listSchemas,
  listTables,
  listVolumes,
  type UCCatalog,
  type UCSchema,
  type UCTable,
  type UCVolume,
} from "../services/api";
import { databricksLinks, openInDatabricks } from "../services/databricksLinks";

// ============================================================================
// Types
// ============================================================================

export type UCItemType = "catalog" | "schema" | "table" | "volume" | "file";

export interface UCItem {
  type: UCItemType;
  name: string;
  fullPath: string;
  catalogName?: string;
  schemaName?: string;
  tableName?: string;
  volumeName?: string;
  tableType?: string;
  volumeType?: string;
  isDir?: boolean;
  size?: number;
  // Sheet ID when this UCItem represents a saved sheet
  id?: string;
}

interface UCBrowserProps {
  onSelect?: (item: UCItem) => void;
  onDragStart?: (item: UCItem, event: React.DragEvent) => void;
  filter?: UCItemType[];
  className?: string;
}

// ============================================================================
// Tree Node Components
// ============================================================================

interface TreeNodeProps {
  label: string;
  icon: typeof Database;
  isExpanded: boolean;
  isLoading?: boolean;
  isSelected?: boolean;
  draggable?: boolean;
  depth: number;
  onToggle: () => void;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onOpenExternal?: () => void;
  children?: React.ReactNode;
}

function TreeNode({
  label,
  icon: Icon,
  isExpanded,
  isLoading,
  isSelected,
  draggable,
  depth,
  onToggle,
  onClick,
  onDragStart,
  onOpenExternal,
  children,
}: TreeNodeProps) {
  return (
    <div>
      <div
        className={clsx(
          "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer group",
          "hover:bg-db-gray-100 transition-colors",
          isSelected && "bg-blue-50 hover:bg-blue-100",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={onClick || onToggle}
        draggable={draggable}
        onDragStart={onDragStart}
      >
        {draggable && (
          <GripVertical className="w-3 h-3 text-db-gray-300 opacity-0 group-hover:opacity-100 cursor-grab" />
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="p-0.5 hover:bg-db-gray-200 rounded"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-db-gray-400 animate-spin" />
          ) : isExpanded ? (
            <ChevronDown className="w-4 h-4 text-db-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-db-gray-400" />
          )}
        </button>

        <Icon
          className={clsx(
            "w-4 h-4",
            isSelected ? "text-blue-600" : "text-db-gray-500",
          )}
        />

        <span
          className={clsx(
            "text-sm flex-1 truncate",
            isSelected ? "text-blue-700 font-medium" : "text-db-gray-700",
          )}
        >
          {label}
        </span>

        {onOpenExternal && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenExternal();
            }}
            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-db-gray-200 rounded"
            title="Open in Databricks"
          >
            <ExternalLink className="w-3 h-3 text-db-gray-400" />
          </button>
        )}
      </div>

      {isExpanded && children}
    </div>
  );
}

interface LeafNodeProps {
  label: string;
  icon: typeof File;
  isSelected?: boolean;
  draggable?: boolean;
  depth: number;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  subtitle?: string;
}

function LeafNode({
  label,
  icon: Icon,
  isSelected,
  draggable,
  depth,
  onClick,
  onDragStart,
  subtitle,
}: LeafNodeProps) {
  return (
    <div
      className={clsx(
        "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer group",
        "hover:bg-db-gray-100 transition-colors",
        isSelected && "bg-blue-50 hover:bg-blue-100",
      )}
      style={{ paddingLeft: `${depth * 16 + 28}px` }}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      {draggable && (
        <GripVertical className="w-3 h-3 text-db-gray-300 opacity-0 group-hover:opacity-100 cursor-grab" />
      )}

      <Icon
        className={clsx(
          "w-4 h-4",
          isSelected ? "text-blue-600" : "text-db-gray-500",
        )}
      />

      <span
        className={clsx(
          "text-sm truncate",
          isSelected ? "text-blue-700 font-medium" : "text-db-gray-700",
        )}
      >
        {label}
      </span>

      {subtitle && (
        <span className="text-xs text-db-gray-400 ml-auto">{subtitle}</span>
      )}
    </div>
  );
}

// ============================================================================
// Browser Sections
// ============================================================================

interface SchemaBrowserProps {
  catalog: UCCatalog;
  depth: number;
  filter?: UCItemType[];
  selectedPath?: string;
  onSelect?: (item: UCItem) => void;
  onDragStart?: (item: UCItem, event: React.DragEvent) => void;
  configuredSchema?: string;
}

function SchemaBrowser({
  catalog,
  depth,
  filter,
  selectedPath,
  onSelect,
  onDragStart,
  configuredSchema,
}: SchemaBrowserProps) {
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(
    new Set(configuredSchema ? [configuredSchema] : []),
  );

  const { data: schemas, isLoading } = useQuery({
    queryKey: ["uc", "schemas", catalog.name],
    queryFn: () => listSchemas(catalog.name),
  });

  // Sort schemas to put configured one first
  const sortedSchemas = schemas?.slice().sort((a, b) => {
    if (a.name === configuredSchema) return -1;
    if (b.name === configuredSchema) return 1;
    return a.name.localeCompare(b.name);
  });

  const toggleSchema = (schemaName: string) => {
    setExpandedSchemas((prev) => {
      const next = new Set(prev);
      if (next.has(schemaName)) {
        next.delete(schemaName);
      } else {
        next.add(schemaName);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div style={{ paddingLeft: `${depth * 16 + 28}px` }} className="py-2">
        <Loader2 className="w-4 h-4 animate-spin text-db-gray-400" />
      </div>
    );
  }

  return (
    <>
      {sortedSchemas?.map((schema) => {
        const isExpanded = expandedSchemas.has(schema.name);
        const isConfigured = schema.name === configuredSchema;

        return (
          <TreeNode
            key={schema.name}
            label={isConfigured ? `${schema.name} ★` : schema.name}
            icon={FolderOpen}
            isExpanded={isExpanded}
            depth={depth}
            onToggle={() => toggleSchema(schema.name)}
            onOpenExternal={() =>
              openInDatabricks(
                databricksLinks.schema(catalog.name, schema.name),
              )
            }
          >
            {isExpanded && (
              <TableVolumeBrowser
                catalog={catalog}
                schema={schema}
                depth={depth + 1}
                filter={filter}
                selectedPath={selectedPath}
                onSelect={onSelect}
                onDragStart={onDragStart}
              />
            )}
          </TreeNode>
        );
      })}
    </>
  );
}

interface TableVolumeBrowserProps {
  catalog: UCCatalog;
  schema: UCSchema;
  depth: number;
  filter?: UCItemType[];
  selectedPath?: string;
  onSelect?: (item: UCItem) => void;
  onDragStart?: (item: UCItem, event: React.DragEvent) => void;
}

function TableVolumeBrowser({
  catalog,
  schema,
  depth,
  filter,
  selectedPath,
  onSelect,
  onDragStart,
}: TableVolumeBrowserProps) {
  const showTables = !filter || filter.includes("table");
  const showVolumes = !filter || filter.includes("volume");

  const { data: tables, isLoading: tablesLoading } = useQuery({
    queryKey: ["uc", "tables", catalog.name, schema.name],
    queryFn: () => listTables(catalog.name, schema.name),
    enabled: showTables,
  });

  const { data: volumes, isLoading: volumesLoading } = useQuery({
    queryKey: ["uc", "volumes", catalog.name, schema.name],
    queryFn: () => listVolumes(catalog.name, schema.name),
    enabled: showVolumes,
  });

  const handleTableSelect = (table: UCTable) => {
    const item: UCItem = {
      type: "table",
      name: table.name,
      fullPath: `${catalog.name}.${schema.name}.${table.name}`,
      catalogName: catalog.name,
      schemaName: schema.name,
      tableName: table.name,
      tableType: table.table_type,
    };
    onSelect?.(item);
  };

  const handleVolumeSelect = (volume: UCVolume) => {
    const item: UCItem = {
      type: "volume",
      name: volume.name,
      fullPath: `/Volumes/${catalog.name}/${schema.name}/${volume.name}`,
      catalogName: catalog.name,
      schemaName: schema.name,
      volumeName: volume.name,
      volumeType: volume.volume_type,
    };
    onSelect?.(item);
  };

  const handleDragStart = (item: UCItem, e: React.DragEvent) => {
    e.dataTransfer.setData("application/json", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "copy";
    onDragStart?.(item, e);
  };

  if (tablesLoading || volumesLoading) {
    return (
      <div style={{ paddingLeft: `${depth * 16 + 28}px` }} className="py-2">
        <Loader2 className="w-4 h-4 animate-spin text-db-gray-400" />
      </div>
    );
  }

  return (
    <>
      {showTables &&
        tables?.map((table) => {
          const tablePath = `${catalog.name}.${schema.name}.${table.name}`;
          const item: UCItem = {
            type: "table",
            name: table.name,
            fullPath: tablePath,
            catalogName: catalog.name,
            schemaName: schema.name,
            tableName: table.name,
            tableType: table.table_type,
          };

          return (
            <LeafNode
              key={table.name}
              label={table.name}
              icon={Table2}
              isSelected={selectedPath === tablePath}
              draggable
              depth={depth}
              onClick={() => handleTableSelect(table)}
              onDragStart={(e) => handleDragStart(item, e)}
              subtitle={table.table_type}
            />
          );
        })}

      {showVolumes &&
        volumes?.map((volume) => {
          const volumePath = `/Volumes/${catalog.name}/${schema.name}/${volume.name}`;
          const item: UCItem = {
            type: "volume",
            name: volume.name,
            fullPath: volumePath,
            catalogName: catalog.name,
            schemaName: schema.name,
            volumeName: volume.name,
            volumeType: volume.volume_type,
          };

          return (
            <LeafNode
              key={volume.name}
              label={volume.name}
              icon={HardDrive}
              isSelected={selectedPath === volumePath}
              draggable
              depth={depth}
              onClick={() => handleVolumeSelect(volume)}
              onDragStart={(e) => handleDragStart(item, e)}
              subtitle={volume.volume_type}
            />
          );
        })}
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function UCBrowser({
  onSelect,
  onDragStart,
  filter,
  className,
}: UCBrowserProps) {
  const [expandedCatalogs, setExpandedCatalogs] = useState<Set<string>>(
    new Set(),
  );
  const [selectedPath, setSelectedPath] = useState<string>();
  const [searchQuery, setSearchQuery] = useState("");
  const [configuredCatalog, setConfiguredCatalog] = useState<string>();
  const [configuredSchema, setConfiguredSchema] = useState<string>();

  // Fetch app config to get default catalog/schema
  useEffect(() => {
    getConfig()
      .then((config) => {
        if (config.catalog) {
          setConfiguredCatalog(config.catalog);
          setExpandedCatalogs(new Set([config.catalog]));
        }
        if (config.schema) {
          setConfiguredSchema(config.schema);
        }
      })
      .catch(() => {
        // Ignore config errors
      });
  }, []);

  const {
    data: catalogs,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["uc", "catalogs"],
    queryFn: listCatalogs,
  });

  // Sort catalogs to put configured one first
  const sortedCatalogs = catalogs?.slice().sort((a, b) => {
    if (a.name === configuredCatalog) return -1;
    if (b.name === configuredCatalog) return 1;
    return a.name.localeCompare(b.name);
  });

  const toggleCatalog = (catalogName: string) => {
    setExpandedCatalogs((prev) => {
      const next = new Set(prev);
      if (next.has(catalogName)) {
        next.delete(catalogName);
      } else {
        next.add(catalogName);
      }
      return next;
    });
  };

  const handleSelect = (item: UCItem) => {
    setSelectedPath(item.fullPath);
    onSelect?.(item);
  };

  const filteredCatalogs = sortedCatalogs?.filter(
    (c) =>
      !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className={clsx("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-db-gray-200">
        <Database className="w-5 h-5 text-db-gray-500" />
        <span className="font-medium text-db-gray-800">Unity Catalog</span>
        <button
          onClick={() => refetch()}
          className="ml-auto p-1 hover:bg-db-gray-100 rounded"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-db-gray-400" />
        </button>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-db-gray-200">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-db-gray-400" />
          <input
            type="text"
            placeholder="Search catalogs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-db-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-db-gray-400" />
          </div>
        ) : filteredCatalogs?.length === 0 ? (
          <div className="text-center py-8 text-db-gray-400 text-sm">
            No catalogs found
          </div>
        ) : (
          filteredCatalogs?.map((catalog) => {
            const isExpanded = expandedCatalogs.has(catalog.name);
            const isConfigured = catalog.name === configuredCatalog;

            return (
              <TreeNode
                key={catalog.name}
                label={isConfigured ? `${catalog.name} ★` : catalog.name}
                icon={Database}
                isExpanded={isExpanded}
                depth={0}
                onToggle={() => toggleCatalog(catalog.name)}
                onOpenExternal={() =>
                  openInDatabricks(databricksLinks.catalog(catalog.name))
                }
              >
                {isExpanded && (
                  <SchemaBrowser
                    catalog={catalog}
                    depth={1}
                    filter={filter}
                    selectedPath={selectedPath}
                    onSelect={handleSelect}
                    onDragStart={onDragStart}
                    configuredSchema={
                      isConfigured ? configuredSchema : undefined
                    }
                  />
                )}
              </TreeNode>
            );
          })
        )}
      </div>

      {/* Footer hint */}
      <div className="p-2 border-t border-db-gray-200 bg-db-gray-50">
        <p className="text-xs text-db-gray-500 text-center">
          Drag tables or volumes to add as data sources
        </p>
      </div>
    </div>
  );
}
