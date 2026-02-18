/**
 * WorkflowContext - Persists user selections across all workflow stages
 *
 * Tracks:
 * - Multi-dataset configuration (primary, secondary, images, labels)
 * - Join configuration between datasets
 * - Selected template (Databit)
 * - Current workflow stage
 * - Stage-specific configurations
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { UCItem } from "../components/UCBrowser";
import type {
  MultiDatasetConfig,
  DataSourceConfig,
  JoinKeyMapping,
  SourceColumn,
  PipelineStage,
} from "../types";

// ============================================================================
// Types
// ============================================================================

// Backward compatibility alias - use PipelineStage directly
export type WorkflowStage = PipelineStage;

export interface Template {
  id: string;
  name: string;
  description?: string;
  system_prompt?: string;
  input_template?: string;
  output_schema?: string;
}

// Re-export SourceColumn from types for backwards compatibility
export type { SourceColumn } from "../types";

export interface WorkflowState {
  // Current stage
  currentStage: PipelineStage;

  // Stage 1: DATA selections (Multi-dataset support)
  // Legacy single-source (for backwards compatibility)
  selectedSource: UCItem | null;
  sourceColumns: SourceColumn[];

  // New multi-dataset configuration
  datasetConfig: MultiDatasetConfig | null;

  // Stage 2: GENERATE selections (template + assembly)
  selectedTemplate: Template | null;
  selectedAssemblyId: string | null;

  // Stage 3: LABEL config
  curationConfig: {
    batchSize?: number;
    qualityThreshold?: number;
  };

  // Stage 4: TRAIN config
  trainingConfig: {
    modelType?: string;
    epochs?: number;
    learningRate?: number;
  };

  // Stage 5: DEPLOY config
  deploymentConfig: {
    endpointName?: string;
    scalingConfig?: string;
  };

  // Workflow metadata
  startedAt?: Date;
  lastUpdatedAt?: Date;
}

interface WorkflowContextType {
  state: WorkflowState;

  // Stage navigation
  setCurrentStage: (stage: PipelineStage) => void;
  goToNextStage: () => void;
  goToPreviousStage: () => void;
  canGoToNextStage: () => boolean;

  // Stage 1: DATA (Legacy single-source)
  setSelectedSource: (source: UCItem | null) => void;
  setSourceColumns: (columns: SourceColumn[]) => void;

  // Stage 1: DATA (Multi-dataset)
  setDatasetConfig: (config: MultiDatasetConfig | null) => void;
  addDataSource: (source: DataSourceConfig) => void;
  removeDataSource: (role: DataSourceConfig["role"]) => void;
  updateDataSource: (
    role: DataSourceConfig["role"],
    updates: Partial<DataSourceConfig>,
  ) => void;
  setJoinKeyMappings: (mappings: JoinKeyMapping[]) => void;

  // Helper to get all columns from all sources (for template schema building)
  getAllSourceColumns: () => SourceColumn[];

  // Stage 2: GENERATE (template selection)
  setSelectedTemplate: (template: Template | null) => void;
  setSelectedAssemblyId: (assemblyId: string | null) => void;

  // Stage 3: LABEL
  setCurationConfig: (config: Partial<WorkflowState["curationConfig"]>) => void;

  // Stage 4: TRAIN
  setTrainingConfig: (config: Partial<WorkflowState["trainingConfig"]>) => void;

  // Stage 5: DEPLOY
  setDeploymentConfig: (
    config: Partial<WorkflowState["deploymentConfig"]>,
  ) => void;

  // Utility
  resetWorkflow: () => void;
  getStageProgress: () => { completed: number; total: number };
}

// ============================================================================
// Stage Helpers
// ============================================================================

const STAGE_ORDER: PipelineStage[] = [
  "data",
  "label",
  "curate",
  "train",
  "deploy",
  "monitor",
  "improve",
];

const STAGE_LABELS: Record<PipelineStage, string> = {
  data: "DATA",
  label: "LABEL",
  curate: "CURATE",
  train: "TRAIN",
  deploy: "DEPLOY",
  monitor: "MONITOR",
  improve: "IMPROVE",
};

export { STAGE_ORDER, STAGE_LABELS };

// ============================================================================
// Initial State
// ============================================================================

const initialState: WorkflowState = {
  currentStage: "data",
  selectedSource: null,
  sourceColumns: [],
  datasetConfig: null,
  selectedTemplate: null,
  selectedAssemblyId: null,
  curationConfig: {},
  trainingConfig: {},
  deploymentConfig: {},
};

// ============================================================================
// Context
// ============================================================================

const WorkflowContext = createContext<WorkflowContextType | undefined>(
  undefined,
);

// ============================================================================
// Provider
// ============================================================================

interface WorkflowProviderProps {
  children: ReactNode;
}

export function WorkflowProvider({ children }: WorkflowProviderProps) {
  const [state, setState] = useState<WorkflowState>({
    ...initialState,
    startedAt: new Date(),
  });

  // Migrate old stage names from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ontosMlWorkbenchStage');
    if (saved === 'template' || saved === 'curate' || saved === 'generate') {
      const newStage: PipelineStage = saved === 'template' || saved === 'generate' ? 'data' : 'label';
      setState(prev => ({ ...prev, currentStage: newStage }));
      localStorage.setItem('ontosMlWorkbenchStage', newStage);
    }
  }, []);

  // Stage navigation
  const setCurrentStage = useCallback((stage: PipelineStage) => {
    setState((prev) => {
      const newState = {
        ...prev,
        currentStage: stage,
        lastUpdatedAt: new Date(),
      };
      return newState;
    });
  }, []);

  const goToNextStage = useCallback(() => {
    setState((prev) => {
      const currentIndex = STAGE_ORDER.indexOf(prev.currentStage);
      if (currentIndex < STAGE_ORDER.length - 1) {
        return {
          ...prev,
          currentStage: STAGE_ORDER[currentIndex + 1],
          lastUpdatedAt: new Date(),
        };
      }
      return prev;
    });
  }, []);

  const goToPreviousStage = useCallback(() => {
    setState((prev) => {
      const currentIndex = STAGE_ORDER.indexOf(prev.currentStage);
      if (currentIndex > 0) {
        return {
          ...prev,
          currentStage: STAGE_ORDER[currentIndex - 1],
          lastUpdatedAt: new Date(),
        };
      }
      return prev;
    });
  }, []);

  const canGoToNextStage = useCallback((): boolean => {
    // Check if current stage has required selections
    switch (state.currentStage) {
      case "data":
        return state.selectedSource !== null;
      case "label":
        return true; // Can always proceed from label
      case "train":
        return true;
      case "deploy":
        return true;
      case "monitor":
        return true;
      case "improve":
        return false; // Last stage
      default:
        return false;
    }
  }, [state]);

  // Stage 1: DATA
  const setSelectedSource = useCallback((source: UCItem | null) => {
    setState((prev) => ({
      ...prev,
      selectedSource: source,
      sourceColumns: [], // Clear columns when source changes
      lastUpdatedAt: new Date(),
    }));
  }, []);

  const setSourceColumns = useCallback((columns: SourceColumn[]) => {
    setState((prev) => ({
      ...prev,
      sourceColumns: columns,
      lastUpdatedAt: new Date(),
    }));
  }, []);

  // Stage 1: DATA (Multi-dataset functions)
  const setDatasetConfig = useCallback((config: MultiDatasetConfig | null) => {
    setState((prev) => ({
      ...prev,
      datasetConfig: config,
      lastUpdatedAt: new Date(),
    }));
  }, []);

  const addDataSource = useCallback((source: DataSourceConfig) => {
    setState((prev) => {
      const currentConfig = prev.datasetConfig || {
        sources: [],
        joinConfig: { keyMappings: [], joinType: "inner" as const },
      };

      // Replace if same role exists, otherwise add
      const existingIndex = currentConfig.sources.findIndex(
        (s) => s.role === source.role,
      );
      const newSources =
        existingIndex >= 0
          ? currentConfig.sources.map((s, i) =>
              i === existingIndex ? source : s,
            )
          : [...currentConfig.sources, source];

      return {
        ...prev,
        datasetConfig: {
          ...currentConfig,
          sources: newSources,
        },
        lastUpdatedAt: new Date(),
      };
    });
  }, []);

  const removeDataSource = useCallback((role: DataSourceConfig["role"]) => {
    setState((prev) => {
      if (!prev.datasetConfig) return prev;

      return {
        ...prev,
        datasetConfig: {
          ...prev.datasetConfig,
          sources: prev.datasetConfig.sources.filter((s) => s.role !== role),
        },
        lastUpdatedAt: new Date(),
      };
    });
  }, []);

  const updateDataSource = useCallback(
    (role: DataSourceConfig["role"], updates: Partial<DataSourceConfig>) => {
      setState((prev) => {
        if (!prev.datasetConfig) return prev;

        return {
          ...prev,
          datasetConfig: {
            ...prev.datasetConfig,
            sources: prev.datasetConfig.sources.map((s) =>
              s.role === role ? { ...s, ...updates } : s,
            ),
          },
          lastUpdatedAt: new Date(),
        };
      });
    },
    [],
  );

  const setJoinKeyMappings = useCallback((mappings: JoinKeyMapping[]) => {
    setState((prev) => {
      if (!prev.datasetConfig) return prev;

      return {
        ...prev,
        datasetConfig: {
          ...prev.datasetConfig,
          joinConfig: {
            ...prev.datasetConfig.joinConfig,
            keyMappings: mappings,
          },
        },
        lastUpdatedAt: new Date(),
      };
    });
  }, []);

  // Helper to get all columns from all sources (for template schema building)
  const getAllSourceColumns = useCallback((): SourceColumn[] => {
    // If using legacy single-source, return those columns
    if (state.sourceColumns.length > 0 && !state.datasetConfig) {
      return state.sourceColumns;
    }

    // If using multi-dataset, combine all source columns with prefixes
    if (state.datasetConfig?.sources) {
      const allColumns: SourceColumn[] = [];

      for (const source of state.datasetConfig.sources) {
        const prefix = source.alias || source.source.name;
        const columns = source.source.columns || [];

        for (const col of columns) {
          allColumns.push({
            ...col,
            name: `${prefix}.${col.name}`,
            comment:
              col.comment || `From ${source.role}: ${source.source.fullPath}`,
          });
        }
      }

      return allColumns;
    }

    return [];
  }, [state.sourceColumns, state.datasetConfig]);

  // Stage 2: GENERATE (template selection)
  const setSelectedTemplate = useCallback((template: Template | null) => {
    setState((prev) => ({
      ...prev,
      selectedTemplate: template,
      lastUpdatedAt: new Date(),
    }));
  }, []);

  const setSelectedAssemblyId = useCallback((assemblyId: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedAssemblyId: assemblyId,
      lastUpdatedAt: new Date(),
    }));
  }, []);

  // Stage 3: LABEL
  const setCurationConfig = useCallback(
    (config: Partial<WorkflowState["curationConfig"]>) => {
      setState((prev) => ({
        ...prev,
        curationConfig: { ...prev.curationConfig, ...config },
        lastUpdatedAt: new Date(),
      }));
    },
    [],
  );

  // Stage 4: TRAIN
  const setTrainingConfig = useCallback(
    (config: Partial<WorkflowState["trainingConfig"]>) => {
      setState((prev) => ({
        ...prev,
        trainingConfig: { ...prev.trainingConfig, ...config },
        lastUpdatedAt: new Date(),
      }));
    },
    [],
  );

  // Stage 5: DEPLOY
  const setDeploymentConfig = useCallback(
    (config: Partial<WorkflowState["deploymentConfig"]>) => {
      setState((prev) => ({
        ...prev,
        deploymentConfig: { ...prev.deploymentConfig, ...config },
        lastUpdatedAt: new Date(),
      }));
    },
    [],
  );

  // Utility
  const resetWorkflow = useCallback(() => {
    setState({
      ...initialState,
      startedAt: new Date(),
    });
  }, []);

  const getStageProgress = useCallback((): {
    completed: number;
    total: number;
  } => {
    let completed = 0;
    const total = STAGE_ORDER.length;

    if (state.selectedSource) completed++;
    if (state.selectedTemplate) completed++;
    // Add more checks as stages are implemented

    return { completed, total };
  }, [state]);

  const value: WorkflowContextType = {
    state,
    setCurrentStage,
    goToNextStage,
    goToPreviousStage,
    canGoToNextStage,
    // Legacy single-source
    setSelectedSource,
    setSourceColumns,
    // Multi-dataset
    setDatasetConfig,
    addDataSource,
    removeDataSource,
    updateDataSource,
    setJoinKeyMappings,
    getAllSourceColumns,
    // Other stages
    setSelectedTemplate,
    setSelectedAssemblyId,
    setCurationConfig,
    setTrainingConfig,
    setDeploymentConfig,
    resetWorkflow,
    getStageProgress,
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useWorkflow(): WorkflowContextType {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error("useWorkflow must be used within a WorkflowProvider");
  }
  return context;
}
