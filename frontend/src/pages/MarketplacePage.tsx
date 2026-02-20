/**
 * Dataset Marketplace (G14) - Browse and subscribe to published data products
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Package,
  Filter,
  X,
  Users,
  Layers,
  Globe,
  Tag,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import {
  searchMarketplace,
  getMarketplaceStats,
  getMarketplaceProduct,
  subscribeToProduct,
} from "../services/governance";
import type {
  MarketplaceProduct,
  MarketplaceStats,
  MarketplaceFacets,
} from "../types/governance";

// Product type display config
const PRODUCT_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  source: { label: "Source", color: "text-blue-700", bg: "bg-blue-100" },
  "source-aligned": { label: "Source-Aligned", color: "text-indigo-700", bg: "bg-indigo-100" },
  aggregate: { label: "Aggregate", color: "text-purple-700", bg: "bg-purple-100" },
  "consumer-aligned": { label: "Consumer-Aligned", color: "text-teal-700", bg: "bg-teal-100" },
};

function ProductTypeBadge({ type }: { type: string }) {
  const config = PRODUCT_TYPE_CONFIG[type] || { label: type, color: "text-gray-700", bg: "bg-gray-100" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ============================================================================
// Stats Overview
// ============================================================================

function StatsOverview({ stats }: { stats: MarketplaceStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Package className="w-4 h-4" />
          Published
        </div>
        <div className="text-2xl font-bold mt-1">{stats.published_products}</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Users className="w-4 h-4" />
          Subscriptions
        </div>
        <div className="text-2xl font-bold mt-1">{stats.total_subscriptions}</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Layers className="w-4 h-4" />
          Types
        </div>
        <div className="text-2xl font-bold mt-1">{Object.keys(stats.products_by_type).length}</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Globe className="w-4 h-4" />
          Domains
        </div>
        <div className="text-2xl font-bold mt-1">{stats.products_by_domain.length}</div>
      </div>
    </div>
  );
}

// ============================================================================
// Product Card
// ============================================================================

function ProductCard({
  product,
  onClick,
}: {
  product: MarketplaceProduct;
  onClick: () => void;
}) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{product.name}</h3>
          {product.domain_name && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{product.domain_name}</span>
          )}
        </div>
        <ProductTypeBadge type={product.product_type} />
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
        {product.description || "No description provided."}
      </p>

      {product.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {product.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300"
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
          {product.tags.length > 4 && (
            <span className="text-xs text-gray-400">+{product.tags.length - 4}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {product.port_count} ports
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {product.subscription_count} subscribers
          </span>
        </div>
        <span>{formatDate(product.published_at || product.updated_at)}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Filter Sidebar
// ============================================================================

function FilterSidebar({
  facets,
  filters,
  onFilterChange,
}: {
  facets: MarketplaceFacets;
  filters: { product_type?: string; domain_id?: string; team_id?: string };
  onFilterChange: (key: string, value: string | undefined) => void;
}) {
  return (
    <div className="w-56 flex-shrink-0 space-y-6">
      {/* Product Type */}
      <div>
        <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Product Type</h4>
        <div className="space-y-1">
          {Object.entries(facets.product_types || {}).map(([type, count]) => (
            <button
              key={type}
              onClick={() => onFilterChange("product_type", filters.product_type === type ? undefined : type)}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm ${
                filters.product_type === type
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <span>{PRODUCT_TYPE_CONFIG[type]?.label || type}</span>
              <span className="text-xs text-gray-400">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Domains */}
      {(facets.domains || []).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Domain</h4>
          <div className="space-y-1">
            {(facets.domains || []).map((d) => (
              <button
                key={d.id}
                onClick={() => onFilterChange("domain_id", filters.domain_id === d.id ? undefined : d.id)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm ${
                  filters.domain_id === d.id
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                <span className="truncate">{d.name}</span>
                <span className="text-xs text-gray-400">{d.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Teams */}
      {(facets.teams || []).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Team</h4>
          <div className="space-y-1">
            {(facets.teams || []).map((t) => (
              <button
                key={t.id}
                onClick={() => onFilterChange("team_id", filters.team_id === t.id ? undefined : t.id)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm ${
                  filters.team_id === t.id
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                <span className="truncate">{t.name}</span>
                <span className="text-xs text-gray-400">{t.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Clear Filters */}
      {(filters.product_type || filters.domain_id || filters.team_id) && (
        <button
          onClick={() => {
            onFilterChange("product_type", undefined);
            onFilterChange("domain_id", undefined);
            onFilterChange("team_id", undefined);
          }}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Product Detail
// ============================================================================

function ProductDetail({
  productId,
  onBack,
}: {
  productId: string;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [purpose, setPurpose] = useState("");

  const { data: product, isLoading } = useQuery({
    queryKey: ["marketplace-product", productId],
    queryFn: () => getMarketplaceProduct(productId),
  });

  const subscribeMutation = useMutation({
    mutationFn: () => subscribeToProduct(productId, { purpose }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-product", productId] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-search"] });
      setPurpose("");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20 text-gray-500">
        Product not found.
        <button onClick={onBack} className="ml-2 text-blue-600 hover:underline">Go back</button>
      </div>
    );
  }

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Marketplace
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{product.name}</h2>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
              {product.domain_name && <span>{product.domain_name}</span>}
              {product.team_name && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <span>{product.team_name}</span>
                </>
              )}
              {product.owner_email && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <span>Owner: {product.owner_email}</span>
                </>
              )}
            </div>
          </div>
          <ProductTypeBadge type={product.product_type} />
        </div>

        <p className="text-gray-700 dark:text-gray-300 mb-4">
          {product.description || "No description provided."}
        </p>

        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {product.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Layers className="w-4 h-4" />
            {product.port_count} ports
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {product.subscription_count} subscribers
          </span>
          <span>Published: {formatDate(product.published_at)}</span>
        </div>
      </div>

      {/* Ports */}
      {product.ports.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Data Ports</h3>
          <div className="space-y-2">
            {product.ports.map((port) => (
              <div
                key={port.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded"
              >
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    port.port_type === "input"
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                  }`}
                >
                  {port.port_type}
                </span>
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {port.name}
                </span>
                {port.entity_type && (
                  <span className="text-xs text-gray-400">
                    {port.entity_type}{port.entity_name ? `: ${port.entity_name}` : ""}
                  </span>
                )}
                {port.description && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                    {port.description}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscribe */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Request Access</h3>
        <div className="space-y-3">
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Describe why you need access to this data product..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
            rows={3}
          />
          <button
            onClick={() => subscribeMutation.mutate()}
            disabled={subscribeMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {subscribeMutation.isPending ? "Requesting..." : "Request Subscription"}
          </button>
          {subscribeMutation.isSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Subscription request submitted. The product owner will review your request.
            </p>
          )}
          {subscribeMutation.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to submit request. {(subscribeMutation.error as Error)?.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Marketplace Page
// ============================================================================

export function MarketplacePage({ onClose }: { onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<{
    product_type?: string;
    domain_id?: string;
    team_id?: string;
  }>({});
  const [sortBy, setSortBy] = useState("updated_at");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  const { data: stats } = useQuery({
    queryKey: ["marketplace-stats"],
    queryFn: getMarketplaceStats,
  });

  const { data: searchResult, isLoading } = useQuery({
    queryKey: ["marketplace-search", searchQuery, filters, sortBy],
    queryFn: () =>
      searchMarketplace({
        query: searchQuery || undefined,
        product_type: filters.product_type,
        domain_id: filters.domain_id,
        team_id: filters.team_id,
        sort_by: sortBy,
        limit: 50,
      }),
  });

  const products = searchResult?.products || [];
  const facets = searchResult?.facets || { product_types: {}, domains: [], teams: [] };

  const handleFilterChange = (key: string, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Detail view
  if (selectedProductId) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dataset Marketplace</h1>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <ProductDetail
          productId={selectedProductId}
          onBack={() => setSelectedProductId(null)}
        />
      </div>
    );
  }

  // Browse view
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dataset Marketplace</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Discover and subscribe to published data products
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Stats */}
      {stats && <StatsOverview stats={stats} />}

      {/* Search bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search data products..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium ${
            showFilters
              ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
              : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
        >
          <option value="updated_at">Recently Updated</option>
          <option value="published_at">Recently Published</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>

      {/* Content area */}
      <div className="flex gap-6">
        {/* Filter sidebar */}
        {showFilters && (
          <FilterSidebar
            facets={facets}
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        )}

        {/* Product grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No published products found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {searchQuery || filters.product_type || filters.domain_id || filters.team_id
                  ? "Try adjusting your search or filters."
                  : "Products will appear here once published in the Governance page."}
              </p>
            </div>
          ) : (
            <>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {searchResult?.total || products.length} product{(searchResult?.total || products.length) !== 1 ? "s" : ""}
                {searchQuery && <> matching &quot;{searchQuery}&quot;</>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={() => setSelectedProductId(product.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
