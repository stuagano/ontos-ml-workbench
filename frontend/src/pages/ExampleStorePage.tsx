/**
 * ExampleStorePage - Manage few-shot learning examples
 *
 * Provides browsing, searching, creating, and managing examples
 * for dynamic few-shot learning and DSPy optimization.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Filter,
  BookOpen,
  MoreVertical,
  Edit,
  Trash2,
  TrendingUp,
  Zap,
  Tag,
  ChevronDown,
  X,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Copy,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { clsx } from "clsx";

import {
  listExamples,
  deleteExample,
  searchExamples,
  getTopExamples,
  trackExampleUsage,
  regenerateExampleEmbeddings,
} from "../services/api";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";
import { Pagination } from "../components/Pagination";
import { ExampleEditor } from "../components/ExampleEditor";
import type {
  ExampleRecord,
  ExampleDomain,
  ExampleDifficulty,
} from "../types";
import { EXAMPLE_DOMAINS, EXAMPLE_DIFFICULTIES } from "../types";

// ============================================================================
// Effectiveness Indicator
// ============================================================================

function EffectivenessIndicator({
  score,
  usageCount,
}: {
  score?: number;
  usageCount: number;
}) {
  if (score === undefined || score === null) {
    return (
      <span className="text-xs text-db-gray-400 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        No data
      </span>
    );
  }

  const getColor = () => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.5) return "text-amber-600";
    return "text-red-600";
  };

  const getBg = () => {
    if (score >= 0.8) return "bg-green-50";
    if (score >= 0.5) return "bg-amber-50";
    return "bg-red-50";
  };

  return (
    <div className={clsx("flex items-center gap-2 px-2 py-1 rounded", getBg())}>
      <TrendingUp className={clsx("w-3 h-3", getColor())} />
      <span className={clsx("text-xs font-medium", getColor())}>
        {(score * 100).toFixed(0)}%
      </span>
      <span className="text-xs text-db-gray-400">({usageCount} uses)</span>
    </div>
  );
}

// ============================================================================
// Example Card
// ============================================================================

interface ExampleCardProps {
  example: ExampleRecord;
  onEdit: (example: ExampleRecord) => void;
  onDelete: (id: string) => void;
  onCopy: (example: ExampleRecord) => void;
}

function ExampleCard({ example, onEdit, onDelete, onCopy }: ExampleCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const difficultyConfig = EXAMPLE_DIFFICULTIES.find(
    (d) => d.id === example.difficulty
  ) || { id: "medium", label: "Medium", color: "amber" };

  const domainLabel =
    EXAMPLE_DOMAINS.find((d) => d.id === example.domain)?.label ||
    example.domain;

  return (
    <div className="bg-white rounded-lg border border-db-gray-200 p-4 hover:border-purple-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2 bg-purple-50 rounded-lg shrink-0">
            <BookOpen className="w-5 h-5 text-purple-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {domainLabel}
              </span>
              <span
                className={clsx(
                  "text-xs px-2 py-0.5 rounded-full",
                  difficultyConfig.color === "green" &&
                    "bg-green-50 text-green-700",
                  difficultyConfig.color === "amber" &&
                    "bg-amber-50 text-amber-700",
                  difficultyConfig.color === "red" && "bg-red-50 text-red-700"
                )}
              >
                {difficultyConfig.label}
              </span>
              {example.has_embedding && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Embedded
                </span>
              )}
            </div>

            {example.explanation && (
              <p className="text-sm text-db-gray-600 mt-2 line-clamp-2">
                {example.explanation}
              </p>
            )}

            {/* Input/Output Preview */}
            <div className="mt-3 space-y-2">
              <div className="text-xs">
                <span className="text-db-gray-500 font-medium">Input:</span>
                <code className="ml-2 text-db-gray-700 bg-db-gray-50 px-1.5 py-0.5 rounded">
                  {JSON.stringify(example.input).slice(0, 80)}
                  {JSON.stringify(example.input).length > 80 && "..."}
                </code>
              </div>
              <div className="text-xs">
                <span className="text-db-gray-500 font-medium">Output:</span>
                <code className="ml-2 text-db-gray-700 bg-db-gray-50 px-1.5 py-0.5 rounded">
                  {JSON.stringify(example.expected_output).slice(0, 80)}
                  {JSON.stringify(example.expected_output).length > 80 && "..."}
                </code>
              </div>
            </div>

            {/* Tags */}
            {example.capability_tags && example.capability_tags.length > 0 && (
              <div className="mt-3 flex items-center gap-1 flex-wrap">
                <Tag className="w-3 h-3 text-db-gray-400" />
                {example.capability_tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-1.5 py-0.5 bg-db-gray-100 text-db-gray-600 rounded"
                  >
                    {tag}
                  </span>
                ))}
                {example.capability_tags.length > 4 && (
                  <span className="text-xs text-db-gray-400">
                    +{example.capability_tags.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="relative ml-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-db-gray-400 hover:text-db-gray-600 rounded"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-8 z-20 bg-white rounded-lg shadow-lg border border-db-gray-200 py-1 min-w-[120px]">
                <button
                  onClick={() => {
                    onCopy(example);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-db-gray-50 flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" /> Copy
                </button>
                <button
                  onClick={() => {
                    onEdit(example);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-db-gray-50 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => {
                    onDelete(example.example_id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-db-gray-50 flex items-center gap-2 text-red-600"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-db-gray-100 flex items-center justify-between">
        <EffectivenessIndicator
          score={example.effectiveness_score}
          usageCount={example.usage_count}
        />
        <span className="text-xs text-db-gray-400">
          {example.updated_at
            ? new Date(example.updated_at).toLocaleDateString()
            : ""}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Top Examples Panel
// ============================================================================

function TopExamplesPanel() {
  const { data: topExamples, isLoading } = useQuery({
    queryKey: ["examples", "top"],
    queryFn: () => getTopExamples({ limit: 5 }),
  });

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg border border-purple-100 p-4">
        <h3 className="font-medium text-purple-800 flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4" />
          Top Performing Examples
        </h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-purple-100/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!topExamples || topExamples.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg border border-purple-100 p-4">
      <h3 className="font-medium text-purple-800 flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4" />
        Top Performing Examples
      </h3>
      <div className="space-y-2">
        {topExamples.map((example, index) => (
          <div
            key={example.example_id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-50 transition-colors"
          >
            <span className="text-lg font-bold text-purple-300 w-6">
              #{index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-db-gray-700 truncate">
                {example.explanation || JSON.stringify(example.input).slice(0, 50)}
              </p>
              <p className="text-xs text-db-gray-500">
                {EXAMPLE_DOMAINS.find((d) => d.id === example.domain)?.label ||
                  example.domain}
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-green-600">
                {example.effectiveness_score
                  ? `${(example.effectiveness_score * 100).toFixed(0)}%`
                  : "-"}
              </span>
              <p className="text-xs text-db-gray-400">{example.usage_count} uses</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface ExampleStorePageProps {
  onClose?: () => void;
}

export function ExampleStorePage({ onClose }: ExampleStorePageProps) {
  const [searchText, setSearchText] = useState("");
  const [domainFilter, setDomainFilter] = useState<ExampleDomain | "">("");
  const [difficultyFilter, setDifficultyFilter] = useState<
    ExampleDifficulty | ""
  >("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [editingExample, setEditingExample] = useState<ExampleRecord | null>(
    null
  );
  const [showEditor, setShowEditor] = useState(false);

  const queryClient = useQueryClient();
  const toast = useToast();

  // List examples query
  const { data, isLoading } = useQuery({
    queryKey: ["examples", domainFilter, difficultyFilter, page],
    queryFn: () =>
      listExamples({
        domain: domainFilter || undefined,
        page,
        page_size: 12,
      }),
  });

  // Search query (when search text is provided)
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["examples", "search", searchText, domainFilter, difficultyFilter],
    queryFn: () =>
      searchExamples({
        query_text: searchText,
        domain: domainFilter || undefined,
        difficulty: difficultyFilter || undefined,
        k: 20,
      }),
    enabled: searchText.length > 2,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteExample,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["examples"] });
      toast.success("Example deleted");
    },
    onError: (error) => toast.error("Delete failed", error.message),
  });

  // Regenerate embeddings mutation
  const regenerateEmbeddingsMutation = useMutation({
    mutationFn: () => regenerateExampleEmbeddings(undefined, false),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["examples"] });
      toast.success(
        "Embeddings regenerated",
        `Processed ${result.processed}, skipped ${result.skipped}, errors ${result.errors}`
      );
    },
    onError: (error) => toast.error("Regeneration failed", error.message),
  });

  // Determine which data to show
  const isSearching = searchText.length > 2;
  const displayExamples = isSearching
    ? searchResults?.results.map((r) => r.example) || []
    : data?.examples || [];
  const totalCount = isSearching
    ? searchResults?.total_matches || 0
    : data?.total || 0;

  const handleCopyExample = async (example: ExampleRecord) => {
    const text = JSON.stringify({ input: example.input, output: example.expected_output }, null, 2);
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
    trackExampleUsage(example.example_id, { context: "copy" }).catch(() => {
      // Fire-and-forget: don't block on tracking failure
    });
  };

  const handleCreateNew = () => {
    setEditingExample(null);
    setShowEditor(true);
  };

  const handleEdit = (example: ExampleRecord) => {
    setEditingExample(example);
    setShowEditor(true);
  };

  const clearFilters = () => {
    setDomainFilter("");
    setDifficultyFilter("");
    setSearchText("");
  };

  const hasFilters =
    domainFilter || difficultyFilter || searchText.length > 2;

  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-db-gray-400 hover:text-db-gray-600 hover:bg-db-gray-100 rounded-lg transition-colors"
                title="Close Example Store"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-db-gray-900">
                Example Store
              </h1>
              <p className="text-db-gray-600 mt-1">
                Manage few-shot learning examples for AI training and inference
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => regenerateEmbeddingsMutation.mutate()}
              disabled={regenerateEmbeddingsMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 text-db-gray-600 hover:text-db-gray-800 hover:bg-db-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Regenerate embeddings for all examples"
            >
              {regenerateEmbeddingsMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Regenerate Embeddings
            </button>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Example
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-db-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-db-gray-400" />
              <input
                type="text"
                placeholder="Search examples by text..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
                showFilters
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-db-gray-300 text-db-gray-600 hover:bg-db-gray-50"
              )}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasFilters && (
                <span className="w-2 h-2 bg-purple-500 rounded-full" />
              )}
              <ChevronDown
                className={clsx(
                  "w-4 h-4 transition-transform",
                  showFilters && "rotate-180"
                )}
              />
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-db-gray-200 flex items-center gap-4">
              <select
                value={domainFilter}
                onChange={(e) =>
                  setDomainFilter(e.target.value as ExampleDomain | "")
                }
                className="px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="">All Domains</option>
                {EXAMPLE_DOMAINS.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.label}
                  </option>
                ))}
              </select>

              <select
                value={difficultyFilter}
                onChange={(e) =>
                  setDifficultyFilter(e.target.value as ExampleDifficulty | "")
                }
                className="px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="">All Difficulties</option>
                {EXAMPLE_DIFFICULTIES.map((diff) => (
                  <option key={diff.id} value={diff.id}>
                    {diff.label}
                  </option>
                ))}
              </select>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-db-gray-600 hover:text-db-gray-800"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}

              <div className="ml-auto text-sm text-db-gray-500">
                {totalCount} example{totalCount !== 1 && "s"} found
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Examples Grid */}
          <div className="lg:col-span-3">
            {isLoading || searchLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : displayExamples.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-lg border border-db-gray-200">
                <BookOpen className="w-12 h-12 text-db-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-db-gray-600">
                  {isSearching ? "No examples match your search" : "No examples yet"}
                </h3>
                <p className="text-db-gray-400 mt-1">
                  {isSearching
                    ? "Try adjusting your search or filters"
                    : "Create your first example to get started"}
                </p>
                {!isSearching && (
                  <button
                    onClick={handleCreateNew}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Create Example
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayExamples.map((example) => (
                    <ExampleCard
                      key={example.example_id}
                      example={example}
                      onEdit={handleEdit}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      onCopy={handleCopyExample}
                    />
                  ))}
                </div>

                {/* Pagination (only for non-search results) */}
                {!isSearching && data && data.total > 12 && (
                  <div className="mt-6">
                    <Pagination
                      currentPage={page}
                      totalPages={Math.ceil(data.total / 12)}
                      totalItems={data.total}
                      pageSize={12}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <TopExamplesPanel />

            {/* Stats Card */}
            <div className="bg-white rounded-lg border border-db-gray-200 p-4">
              <h3 className="font-medium text-db-gray-800 mb-3">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-db-gray-600">Total Examples</span>
                  <span className="font-medium">{data?.total || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-db-gray-600">Domains</span>
                  <span className="font-medium">{EXAMPLE_DOMAINS.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-db-gray-600 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    With Embeddings
                  </span>
                  <span className="font-medium text-purple-600">
                    {displayExamples.filter((e) => e.has_embedding).length}
                  </span>
                </div>
              </div>
            </div>

            {/* Help Card */}
            <div className="bg-blue-50 rounded-lg border border-blue-100 p-4">
              <h3 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Tips
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Add diverse examples for better coverage</li>
                <li>• Include edge cases and difficult scenarios</li>
                <li>• Track effectiveness to identify top performers</li>
                <li>• Use tags for easy filtering</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Example Editor Modal */}
      {showEditor && (
        <ExampleEditor
          example={editingExample}
          onClose={() => setShowEditor(false)}
          onSaved={() => {
            setShowEditor(false);
            setEditingExample(null);
            queryClient.invalidateQueries({ queryKey: ["examples"] });
            toast.success(
              editingExample ? "Example updated" : "Example created"
            );
          }}
        />
      )}
    </div>
  );
}
