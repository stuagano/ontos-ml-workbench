// This is the new table-based TemplatePage return statement
// Replace the existing return statement with this

  // Define table columns
  const columns: Column<Template>[] = [
    {
      key: "name",
      header: "Name",
      width: "30%",
      render: (template) => (
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-db-gray-900">{template.name}</div>
            {template.description && (
              <div className="text-sm text-db-gray-500 truncate">
                {template.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "15%",
      render: (template) => {
        const status = statusConfig[template.status];
        return (
          <span
            className={clsx("px-2 py-1 rounded-full text-xs font-medium", status.bg, status.color)}
          >
            {status.label}
          </span>
        );
      },
    },
    {
      key: "model",
      header: "Base Model",
      width: "20%",
      render: (template) => (
        <span className="text-sm text-db-gray-600">
          {template.base_model.split("-").slice(-3).join("-")}
        </span>
      ),
    },
    {
      key: "version",
      header: "Version",
      width: "10%",
      render: (template) => (
        <span className="text-sm text-db-gray-600">v{template.version}</span>
      ),
    },
    {
      key: "updated",
      header: "Last Updated",
      width: "15%",
      render: (template) => (
        <span className="text-sm text-db-gray-500">
          {template.updated_at
            ? new Date(template.updated_at).toLocaleDateString()
            : "N/A"}
        </span>
      ),
    },
  ];

  // Define row actions
  const rowActions: RowAction<Template>[] = [
    {
      label: "Select for Workflow",
      icon: CheckCircle,
      onClick: handleSelectTemplate,
      className: "text-purple-600",
    },
    {
      label: "Edit",
      icon: Edit,
      onClick: onEditTemplate,
    },
    {
      label: "DSPy Optimization",
      icon: Zap,
      onClick: setDspyTemplate,
      className: "text-purple-600",
    },
    {
      label: "Publish",
      icon: CheckCircle,
      onClick: (template) => publishMutation.mutate(template.id),
      show: (template) => template.status === "draft",
      className: "text-green-600",
    },
    {
      label: "Archive",
      icon: Archive,
      onClick: (template) => archiveMutation.mutate(template.id),
      show: (template) => template.status !== "archived",
    },
    {
      label: "Delete",
      icon: Trash2,
      onClick: (template) => {
        if (confirm(`Delete "${template.name}"?`)) {
          deleteMutation.mutate(template.id);
        }
      },
      show: (template) => template.status === "draft",
      className: "text-red-600",
    },
  ];

  const emptyState = (
    <div className="text-center py-20 bg-white rounded-lg">
      <FileText className="w-16 h-16 text-db-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-db-gray-700 mb-2">
        No templates found
      </h3>
      <p className="text-db-gray-500 mb-6">
        {search || statusFilter
          ? "Try adjusting your filters"
          : "Create your first Databit to get started"}
      </p>
      <button
        onClick={() => onEditTemplate(null)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
      >
        <Plus className="w-4 h-4" />
        Create Template
      </button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-db-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-db-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-db-gray-900">Templates</h1>
              <p className="text-db-gray-600 mt-1">
                Manage prompt templates for your AI workflows
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["templates"] })}
                className="flex items-center gap-2 px-3 py-2 text-db-gray-600 hover:text-db-gray-800 hover:bg-db-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={() => onEditTemplate(null)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Template
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Banner */}
      <div className="px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <WorkflowBanner />

          {/* Selected Template Indicator */}
          {state.selectedTemplate && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-purple-600" />
                <span className="text-purple-800">
                  Selected: <strong>{state.selectedTemplate.name}</strong>
                </span>
              </div>
              <button
                onClick={handleContinue}
                disabled={!canContinue}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                  canContinue
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : "bg-db-gray-200 text-db-gray-500 cursor-not-allowed"
                )}
              >
                Continue to Curate
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-6">
        <div className="max-w-7xl mx-auto mb-4">
          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-db-gray-200">
            <Filter className="w-4 h-4 text-db-gray-400" />
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-db-gray-400" />
              <input
                type="text"
                placeholder="Filter templates by name or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-0 focus:outline-none focus:ring-0"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TemplateStatus | "")}
              className="px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            {(search || statusFilter) && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                }}
                className="text-sm text-db-gray-500 hover:text-db-gray-700"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 px-6 pb-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : (
            <DataTable
              data={templates}
              columns={columns}
              rowKey={(template) => template.id}
              onRowClick={handleSelectTemplate}
              rowActions={rowActions}
              emptyState={emptyState}
            />
          )}
        </div>
      </div>

      {/* DSPy Optimization Modal */}
      {dspyTemplate && (
        <DSPyOptimizationPage
          template={dspyTemplate}
          onClose={() => setDspyTemplate(null)}
        />
      )}
    </div>
  );
