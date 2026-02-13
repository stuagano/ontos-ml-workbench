/**
 * Deep link utilities for Databricks native UIs
 */

let workspaceUrl = "";

export function setWorkspaceUrl(url: string) {
  workspaceUrl = url.replace(/\/$/, "");
}

export function getWorkspaceUrl(): string {
  return workspaceUrl;
}

/**
 * Generate deep links to Databricks native UIs
 */
export const databricksLinks = {
  // Unity Catalog
  catalogExplorer: () => `${workspaceUrl}/explore/data`,

  catalog: (catalogName: string) =>
    `${workspaceUrl}/explore/data/${encodeURIComponent(catalogName)}`,

  schema: (catalogName: string, schemaName: string) =>
    `${workspaceUrl}/explore/data/${encodeURIComponent(catalogName)}/${encodeURIComponent(schemaName)}`,

  table: (catalogName: string, schemaName: string, tableName: string) =>
    `${workspaceUrl}/explore/data/${encodeURIComponent(catalogName)}/${encodeURIComponent(schemaName)}/${encodeURIComponent(tableName)}`,

  volume: (catalogName: string, schemaName: string, volumeName: string) =>
    `${workspaceUrl}/explore/data/${encodeURIComponent(catalogName)}/${encodeURIComponent(schemaName)}/volumes/${encodeURIComponent(volumeName)}`,

  // SQL
  sqlEditor: () => `${workspaceUrl}/sql/editor`,

  sqlQuery: (queryId: string) => `${workspaceUrl}/sql/editor/${queryId}`,

  // Jobs & Workflows
  jobs: () => `${workspaceUrl}/jobs`,

  job: (jobId: string) => `${workspaceUrl}/jobs/${jobId}`,

  jobRun: (jobId: string, runId: string) =>
    `${workspaceUrl}/jobs/${jobId}/runs/${runId}`,

  // ML & AI
  mlflowExperiments: () => `${workspaceUrl}/ml/experiments`,

  mlflowExperiment: (experimentId: string) =>
    `${workspaceUrl}/ml/experiments/${experimentId}`,

  mlflowRun: (experimentId: string, runId: string) =>
    `${workspaceUrl}/ml/experiments/${experimentId}/runs/${runId}`,

  modelRegistry: () => `${workspaceUrl}/ml/models`,

  model: (modelName: string) =>
    `${workspaceUrl}/ml/models/${encodeURIComponent(modelName)}`,

  // Model Serving
  servingEndpoints: () => `${workspaceUrl}/ml/endpoints`,

  servingEndpoint: (endpointName: string) =>
    `${workspaceUrl}/ml/endpoints/${encodeURIComponent(endpointName)}`,

  // Lineage
  lineage: (catalogName: string, schemaName: string, tableName: string) =>
    `${workspaceUrl}/explore/data/${encodeURIComponent(catalogName)}/${encodeURIComponent(schemaName)}/${encodeURIComponent(tableName)}?o=lineage`,

  // Lakehouse Monitoring
  monitor: (tablePath: string) =>
    `${workspaceUrl}/explore/data/${tablePath.replace(/\./g, "/")}?tab=quality`,

  // Compute
  clusters: () => `${workspaceUrl}/compute`,

  cluster: (clusterId: string) =>
    `${workspaceUrl}/compute/clusters/${clusterId}`,

  warehouses: () => `${workspaceUrl}/sql/warehouses`,

  warehouse: (warehouseId: string) =>
    `${workspaceUrl}/sql/warehouses/${warehouseId}`,

  // Notebooks
  notebooks: () => `${workspaceUrl}/workspace`,

  notebook: (path: string) =>
    `${workspaceUrl}/#notebook${path.startsWith("/") ? path : "/" + path}`,

  // UC Functions (for AI tools)
  ucFunction: (catalogName: string, schemaName: string, functionName: string) =>
    `${workspaceUrl}/explore/data/${encodeURIComponent(catalogName)}/${encodeURIComponent(schemaName)}/functions/${encodeURIComponent(functionName)}`,

  // Vector Search
  vectorSearchEndpoints: () => `${workspaceUrl}/ml/vector-search`,

  vectorSearchEndpoint: (endpointName: string) =>
    `${workspaceUrl}/ml/vector-search/${encodeURIComponent(endpointName)}`,

  // Playground (AI Gateway)
  aiPlayground: () => `${workspaceUrl}/ml/playground`,

  // Dashboards
  dashboards: () => `${workspaceUrl}/sql/dashboards`,

  dashboard: (dashboardId: string) =>
    `${workspaceUrl}/sql/dashboards/${dashboardId}`,

  // Lakehouse Monitoring - more specific links
  lakehouseMonitoring: () => `${workspaceUrl}/explore/data?tab=quality`,

  endpointMonitor: (endpointName: string) =>
    `${workspaceUrl}/ml/endpoints/${encodeURIComponent(endpointName)}?tab=metrics`,

  inferenceTable: (
    catalogName: string,
    schemaName: string,
    tableName: string,
  ) =>
    `${workspaceUrl}/explore/data/${encodeURIComponent(catalogName)}/${encodeURIComponent(schemaName)}/${encodeURIComponent(tableName)}?tab=quality`,

  // MLflow Tracing
  mlflowTracing: () => `${workspaceUrl}/ml/tracing`,

  mlflowTrace: (traceId: string) => `${workspaceUrl}/ml/tracing/${traceId}`,
};

/**
 * Open a Databricks link in a new tab
 */
export function openInDatabricks(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Convenience functions that generate URL and open
 */
export const openDatabricks = {
  catalogExplorer: () => openInDatabricks(databricksLinks.catalogExplorer()),
  table: (catalog: string, schema: string, table: string) =>
    openInDatabricks(databricksLinks.table(catalog, schema, table)),
  volume: (catalog: string, schema: string, volume: string) =>
    openInDatabricks(databricksLinks.volume(catalog, schema, volume)),
  sqlEditor: () => openInDatabricks(databricksLinks.sqlEditor()),
  jobs: () => openInDatabricks(databricksLinks.jobs()),
  job: (jobId: string) => openInDatabricks(databricksLinks.job(jobId)),
  jobRun: (jobId: string, runId: string) =>
    openInDatabricks(databricksLinks.jobRun(jobId, runId)),
  mlflowExperiments: () =>
    openInDatabricks(databricksLinks.mlflowExperiments()),
  model: (modelName: string) =>
    openInDatabricks(databricksLinks.model(modelName)),
  servingEndpoints: () => openInDatabricks(databricksLinks.servingEndpoints()),
  servingEndpoint: (name: string) =>
    openInDatabricks(databricksLinks.servingEndpoint(name)),
  notebook: (path: string) => openInDatabricks(databricksLinks.notebook(path)),
  ucFunction: (catalog: string, schema: string, fn: string) =>
    openInDatabricks(databricksLinks.ucFunction(catalog, schema, fn)),
  vectorSearch: () => openInDatabricks(databricksLinks.vectorSearchEndpoints()),
  aiPlayground: () => openInDatabricks(databricksLinks.aiPlayground()),
  dashboards: () => openInDatabricks(databricksLinks.dashboards()),
  lakehouseMonitoring: () =>
    openInDatabricks(databricksLinks.lakehouseMonitoring()),
  endpointMonitor: (name: string) =>
    openInDatabricks(databricksLinks.endpointMonitor(name)),
  mlflowTracing: () => openInDatabricks(databricksLinks.mlflowTracing()),
};
