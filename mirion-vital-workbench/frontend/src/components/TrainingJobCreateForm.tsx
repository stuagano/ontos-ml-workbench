/**
 * TrainingJobCreateForm - Form to create a new training job
 *
 * Pure visualization component:
 * - Collects user input
 * - Submits to backend
 * - Backend calculates train/val counts, validates config, etc.
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Play, Loader2, AlertCircle, Info } from "lucide-react";
import { createTrainingJob } from "../services/api";
import { useToast } from "./Toast";
import type { AssembledDataset, TrainingJobCreateRequest, AVAILABLE_TRAINING_MODELS } from "../types";

interface TrainingJobCreateFormProps {
  assembly: AssembledDataset;
  onSuccess: (jobId: string) => void;
  onCancel: () => void;
}

const TRAINING_MODELS = [
  {
    id: "databricks-meta-llama-3-1-70b-instruct",
    name: "Llama 3.1 70B Instruct",
    description: "Best quality, higher cost",
    recommended: false,
  },
  {
    id: "databricks-meta-llama-3-1-8b-instruct",
    name: "Llama 3.1 8B Instruct",
    description: "Good balance of quality and speed",
    recommended: true,
  },
  {
    id: "databricks-dbrx-instruct",
    name: "DBRX Instruct",
    description: "Databricks native model",
    recommended: false,
  },
  {
    id: "databricks-mixtral-8x7b-instruct",
    name: "Mixtral 8x7B Instruct",
    description: "Strong reasoning capabilities",
    recommended: false,
  },
];

export function TrainingJobCreateForm({ assembly, onSuccess, onCancel }: TrainingJobCreateFormProps) {
  const { toast } = useToast();

  // Form state (UI only - not business logic)
  const [modelName, setModelName] = useState(`${assembly.sheet_name || 'model'}-v1`.replace(/\s+/g, '-').toLowerCase());
  const [baseModel, setBaseModel] = useState(TRAINING_MODELS[1].id);
  const [trainSplit, setTrainSplit] = useState(0.8); // Backend expects 0.8 not 80
  const [epochs, setEpochs] = useState(3);
  const [learningRate, setLearningRate] = useState(0.0001);
  const [registerToUC, setRegisterToUC] = useState(true);

  // Calculate eligible pairs count (readonly - for display only)
  const labeledCount = assembly.human_labeled_count + assembly.human_verified_count;
  const eligibleForTraining = labeledCount; // Backend will apply governance filters

  // Create job mutation
  const createJob = useMutation({
    mutationFn: async (request: TrainingJobCreateRequest) => {
      return createTrainingJob(request);
    },
    onSuccess: (job) => {
      toast({
        title: "Training Job Created",
        description: `Job ${job.id.slice(0, 8)} submitted successfully`,
      });
      onSuccess(job.id);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Job",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic UI validation
    if (!modelName.trim()) {
      toast({
        title: "Validation Error",
        description: "Model name is required",
        variant: "destructive",
      });
      return;
    }

    if (eligibleForTraining < 10) {
      toast({
        title: "Insufficient Data",
        description: "Need at least 10 labeled pairs for training",
        variant: "destructive",
      });
      return;
    }

    // Submit to backend (backend validates and calculates everything)
    createJob.mutate({
      training_sheet_id: assembly.id,
      model_name: modelName,
      base_model: baseModel,
      train_val_split: trainSplit,
      training_config: {
        epochs,
        learning_rate: learningRate,
      },
      register_to_uc: registerToUC,
      uc_catalog: "mirion_vital",
      uc_schema: "models",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Assembly Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-medium text-green-800 mb-2">
          {assembly.sheet_name || `Assembly ${assembly.id.slice(0, 8)}`}
        </h3>
        <div className="grid grid-cols-3 gap-4 text-sm text-green-700">
          <div>
            <div className="font-medium">Total Rows</div>
            <div className="text-lg">{assembly.total_rows}</div>
          </div>
          <div>
            <div className="font-medium">Labeled (Approved)</div>
            <div className="text-lg">{labeledCount}</div>
          </div>
          <div>
            <div className="font-medium">Eligible for Training</div>
            <div className="text-lg">{eligibleForTraining}</div>
          </div>
        </div>
        {eligibleForTraining < assembly.total_rows && (
          <div className="mt-2 flex items-start gap-2 text-sm text-green-700">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Backend will filter out pairs with governance constraints (PHI, confidential data, etc.)
            </span>
          </div>
        )}
      </div>

      {/* Model Name */}
      <div>
        <label className="block text-sm font-medium text-db-gray-700 mb-1">
          Model Name
        </label>
        <input
          type="text"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          className="w-full px-3 py-2 border border-db-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="my-invoice-extractor-v1"
          required
        />
        <p className="mt-1 text-sm text-db-gray-500">
          This will be registered to Unity Catalog as: mirion_vital.models.{modelName}
        </p>
      </div>

      {/* Base Model Selection */}
      <div>
        <label className="block text-sm font-medium text-db-gray-700 mb-2">
          Base Model
        </label>
        <div className="space-y-2">
          {TRAINING_MODELS.map((model) => (
            <label
              key={model.id}
              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                baseModel === model.id
                  ? 'border-green-500 bg-green-50'
                  : 'border-db-gray-200 hover:border-db-gray-300'
              }`}
            >
              <input
                type="radio"
                name="baseModel"
                value={model.id}
                checked={baseModel === model.id}
                onChange={(e) => setBaseModel(e.target.value)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-db-gray-900">{model.name}</span>
                  {model.recommended && (
                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-sm text-db-gray-600">{model.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Train/Val Split */}
      <div>
        <label className="block text-sm font-medium text-db-gray-700 mb-2">
          Train / Validation Split: {Math.round(trainSplit * 100)}% / {Math.round((1 - trainSplit) * 100)}%
        </label>
        <input
          type="range"
          min={0.6}
          max={0.95}
          step={0.05}
          value={trainSplit}
          onChange={(e) => setTrainSplit(Number(e.target.value))}
          className="w-full accent-green-600"
        />
        <div className="mt-2 text-sm text-db-gray-600">
          Backend will calculate exact train/val counts based on eligible pairs and governance filters
        </div>
      </div>

      {/* Training Config */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-db-gray-700 mb-1">
            Epochs
          </label>
          <input
            type="number"
            value={epochs}
            onChange={(e) => setEpochs(Number(e.target.value))}
            min={1}
            max={10}
            className="w-full px-3 py-2 border border-db-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-db-gray-700 mb-1">
            Learning Rate
          </label>
          <input
            type="number"
            value={learningRate}
            onChange={(e) => setLearningRate(Number(e.target.value))}
            step={0.00001}
            min={0.00001}
            max={0.01}
            className="w-full px-3 py-2 border border-db-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Unity Catalog Registration */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="register-uc"
          checked={registerToUC}
          onChange={(e) => setRegisterToUC(e.target.checked)}
          className="mt-1"
        />
        <label htmlFor="register-uc" className="text-sm text-db-gray-700">
          <div className="font-medium">Register to Unity Catalog</div>
          <div className="text-db-gray-600">
            Automatically register trained model to Unity Catalog for versioning and governance
          </div>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-db-gray-700 hover:bg-db-gray-100 rounded-md transition-colors"
          disabled={createJob.isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createJob.isPending || eligibleForTraining < 10}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createJob.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating Job...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Start Training
            </>
          )}
        </button>
      </div>
    </form>
  );
}
