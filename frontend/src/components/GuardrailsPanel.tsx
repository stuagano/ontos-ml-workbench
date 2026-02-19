/**
 * GuardrailsPanel — Configure AI Gateway guardrails for a serving endpoint.
 *
 * Supports safety filters, PII handling, keyword filtering, and rate limits.
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  X,
  Loader2,
  Plus,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { getGuardrails, setGuardrails } from "../services/api";
import type {
  GuardrailsConfig,
  GuardrailParameters,
  RateLimitConfig,
} from "../types";
import { useToast } from "./Toast";

interface GuardrailsPanelProps {
  endpointName: string;
  onClose: () => void;
}

const DEFAULT_PARAMS: GuardrailParameters = {
  safety: false,
  pii_behavior: "NONE",
  invalid_keywords: [],
  valid_topics: [],
};

const DEFAULT_CONFIG: GuardrailsConfig = {
  input_guardrails: { ...DEFAULT_PARAMS },
  output_guardrails: { ...DEFAULT_PARAMS },
  rate_limits: [],
};

function GuardrailSection({
  label,
  params,
  onChange,
}: {
  label: string;
  params: GuardrailParameters;
  onChange: (params: GuardrailParameters) => void;
}) {
  const [newKeyword, setNewKeyword] = useState("");
  const [newTopic, setNewTopic] = useState("");

  return (
    <div className="border border-db-gray-200 rounded-lg p-4 space-y-3">
      <h4 className="font-medium text-db-gray-900 text-sm">{label}</h4>

      {/* Safety Toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={params.safety}
          onChange={(e) => onChange({ ...params, safety: e.target.checked })}
          className="rounded border-db-gray-300"
        />
        <span className="text-sm text-db-gray-700">Enable safety filters</span>
      </label>

      {/* PII Behavior */}
      <div>
        <label className="block text-xs font-medium text-db-gray-600 mb-1">
          PII Handling
        </label>
        <select
          value={params.pii_behavior}
          onChange={(e) =>
            onChange({
              ...params,
              pii_behavior: e.target.value as "NONE" | "MASK" | "BLOCK",
            })
          }
          className="w-full text-sm border border-db-gray-300 rounded px-2 py-1.5"
        >
          <option value="NONE">None (allow PII)</option>
          <option value="MASK">Mask (redact PII)</option>
          <option value="BLOCK">Block (reject if PII detected)</option>
        </select>
      </div>

      {/* Invalid Keywords */}
      <div>
        <label className="block text-xs font-medium text-db-gray-600 mb-1">
          Blocked Keywords
        </label>
        <div className="flex flex-wrap gap-1 mb-1">
          {params.invalid_keywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full"
            >
              {kw}
              <button
                onClick={() =>
                  onChange({
                    ...params,
                    invalid_keywords: params.invalid_keywords.filter(
                      (k) => k !== kw,
                    ),
                  })
                }
                className="hover:text-red-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newKeyword.trim()) {
                onChange({
                  ...params,
                  invalid_keywords: [
                    ...params.invalid_keywords,
                    newKeyword.trim(),
                  ],
                });
                setNewKeyword("");
              }
            }}
            placeholder="Add keyword..."
            className="flex-1 text-xs border border-db-gray-300 rounded px-2 py-1"
          />
          <button
            onClick={() => {
              if (newKeyword.trim()) {
                onChange({
                  ...params,
                  invalid_keywords: [
                    ...params.invalid_keywords,
                    newKeyword.trim(),
                  ],
                });
                setNewKeyword("");
              }
            }}
            className="text-xs px-2 py-1 bg-db-gray-100 rounded hover:bg-db-gray-200"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Valid Topics */}
      <div>
        <label className="block text-xs font-medium text-db-gray-600 mb-1">
          Allowed Topics (empty = all topics allowed)
        </label>
        <div className="flex flex-wrap gap-1 mb-1">
          {params.valid_topics.map((topic) => (
            <span
              key={topic}
              className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full"
            >
              {topic}
              <button
                onClick={() =>
                  onChange({
                    ...params,
                    valid_topics: params.valid_topics.filter(
                      (t) => t !== topic,
                    ),
                  })
                }
                className="hover:text-green-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTopic.trim()) {
                onChange({
                  ...params,
                  valid_topics: [...params.valid_topics, newTopic.trim()],
                });
                setNewTopic("");
              }
            }}
            placeholder="Add topic..."
            className="flex-1 text-xs border border-db-gray-300 rounded px-2 py-1"
          />
          <button
            onClick={() => {
              if (newTopic.trim()) {
                onChange({
                  ...params,
                  valid_topics: [...params.valid_topics, newTopic.trim()],
                });
                setNewTopic("");
              }
            }}
            className="text-xs px-2 py-1 bg-db-gray-100 rounded hover:bg-db-gray-200"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function GuardrailsPanel({
  endpointName,
  onClose,
}: GuardrailsPanelProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<GuardrailsConfig>(DEFAULT_CONFIG);

  const { data, isLoading } = useQuery({
    queryKey: ["guardrails", endpointName],
    queryFn: () => getGuardrails(endpointName),
  });

  useEffect(() => {
    if (data?.guardrails) {
      setConfig(data.guardrails);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => setGuardrails(endpointName, config),
    onSuccess: () => {
      toast.success("Guardrails Applied", `Updated guardrails for ${endpointName}`);
      queryClient.invalidateQueries({ queryKey: ["guardrails", endpointName] });
    },
    onError: (err: Error) => {
      toast.error("Failed to Apply Guardrails", err.message);
    },
  });

  const addRateLimit = () => {
    setConfig({
      ...config,
      rate_limits: [
        ...config.rate_limits,
        { key: "ENDPOINT", calls: 100, renewal_period: "minute" },
      ],
    });
  };

  const removeRateLimit = (index: number) => {
    setConfig({
      ...config,
      rate_limits: config.rate_limits.filter((_, i) => i !== index),
    });
  };

  const updateRateLimit = (index: number, updates: Partial<RateLimitConfig>) => {
    const updated = config.rate_limits.map((rl, i) =>
      i === index ? { ...rl, ...updates } : rl,
    );
    setConfig({ ...config, rate_limits: updated });
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-end">
      <div className="w-[520px] h-full bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-db-gray-200">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-db-orange" />
            <h2 className="font-semibold text-db-gray-900">
              Guardrails: {endpointName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-db-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-db-orange" />
            </div>
          ) : (
            <>
              {data?.applied && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                  <CheckCircle className="w-4 h-4" />
                  Guardrails are currently active on this endpoint
                </div>
              )}

              {/* Input Guardrails */}
              <GuardrailSection
                label="Input Guardrails"
                params={config.input_guardrails}
                onChange={(p) =>
                  setConfig({ ...config, input_guardrails: p })
                }
              />

              {/* Output Guardrails */}
              <GuardrailSection
                label="Output Guardrails"
                params={config.output_guardrails}
                onChange={(p) =>
                  setConfig({ ...config, output_guardrails: p })
                }
              />

              {/* Rate Limits */}
              <div className="border border-db-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-db-gray-900 text-sm">
                    Rate Limits
                  </h4>
                  <button
                    onClick={addRateLimit}
                    className="text-xs text-db-orange hover:text-orange-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Limit
                  </button>
                </div>

                {config.rate_limits.length === 0 && (
                  <p className="text-xs text-db-gray-500">
                    No rate limits configured
                  </p>
                )}

                {config.rate_limits.map((rl, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-db-gray-50 p-2 rounded"
                  >
                    <select
                      value={rl.key}
                      onChange={(e) =>
                        updateRateLimit(i, {
                          key: e.target.value as RateLimitConfig["key"],
                        })
                      }
                      className="text-xs border border-db-gray-300 rounded px-1.5 py-1"
                    >
                      <option value="ENDPOINT">Per Endpoint</option>
                      <option value="USER">Per User</option>
                      <option value="SERVICE_PRINCIPAL">
                        Per Service Principal
                      </option>
                    </select>
                    <input
                      type="number"
                      value={rl.calls}
                      onChange={(e) =>
                        updateRateLimit(i, {
                          calls: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-20 text-xs border border-db-gray-300 rounded px-1.5 py-1"
                    />
                    <span className="text-xs text-db-gray-500">
                      calls/min
                    </span>
                    <button
                      onClick={() => removeRateLimit(i)}
                      className="ml-auto p-1 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-db-gray-200">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-db-gray-600 hover:text-db-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="px-4 py-1.5 text-sm bg-db-orange text-white rounded hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
          >
            {saveMutation.isPending && (
              <Loader2 className="w-3 h-3 animate-spin" />
            )}
            Apply Guardrails
          </button>
        </div>
      </div>
    </div>
  );
}
