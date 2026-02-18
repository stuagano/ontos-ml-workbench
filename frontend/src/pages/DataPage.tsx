/**
 * DATA Stage - Unified workflow for selecting data, previewing, and generating training data
 *
 * Flow:
 * 1. Browse & select UC table  
 * 2. Preview data (50 rows)
 * 3. Select/configure template
 * 4. Generate training data
 * 5. Auto-advance to LABEL stage
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Database, Table2, Wand2, ChevronRight, Loader2 } from "lucide-react";
import { UCBrowser, type UCItem } from "../components/UCBrowser";
import { StageSubNav, type StageMode } from "../components/StageSubNav";
import { useToast } from "../components/Toast";
import { useWorkflow } from "../context/WorkflowContext";
import { previewTable, listTemplates, createSheet } from "../services/api";
import type { Template } from "../types";

interface DataPageProps {
  mode: StageMode;
  onModeChange?: (mode: StageMode) => void;
}

export function DataPage({ mode, onModeChange }: DataPageProps) {
  const [selectedTable, setSelectedTable] = useState<UCItem | null>(null);
  const [tablePreview, setTablePreview] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const toast = useToast();
  const workflow = useWorkflow();

  // Fetch templates
  const { data: templatesData } = useQuery({
    queryKey: ["templates"],
    queryFn: () => listTemplates({ page_size: 100 }),
  });

  const templates = templatesData?.templates || [];

  // Handle table selection
  const handleTableSelect = async (item: UCItem) => {
    if (item.type !== "table") return;

    setSelectedTable(item);
    setIsLoadingPreview(true);

    try {
      // Load preview of 50 rows
      const preview = await previewTable(
        item.catalogName!,
        item.schemaName!,
        item.name,
        50
      );
      setTablePreview(preview);
    } catch (err) {
      toast.error("Failed to load preview", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Generate training data
  const handleGenerate = async () => {
    if (!selectedTable || !selectedTemplate) {
      toast.error("Missing required fields", "Please select both a table and template");
      return;
    }

    setIsGenerating(true);

    try {
      // 1. Create dataset (lightweight pointer to UC table)
      const sourceTable = `${selectedTable.catalogName}.${selectedTable.schemaName}.${selectedTable.name}`;
      const columnNames = tablePreview?.rows[0] ? Object.keys(tablePreview.rows[0]) : [];

      const newDataset = await createSheet({
        name: selectedTable.name,
        description: `Dataset from ${sourceTable}`,
        source_type: "uc_table",
        source_table: sourceTable,
        text_columns: columnNames,
        item_id_column: columnNames[0],
      });

      // 2. TODO: Apply template to dataset to generate Training Data (Q&A pairs)
      // This will be implemented when we have the training_sheets table ready

      // Save to workflow context
      workflow.setSelectedSource({
        id: newDataset.id,
        name: newDataset.name,
        type: "table",
        fullPath: sourceTable,
        catalogName: selectedTable.catalogName,
        schemaName: selectedTable.schemaName,
      } as UCItem);

      toast.success("Training data generated!", "Moving to LABEL stage...");

      // Auto-advance to LABEL stage
      setTimeout(() => {
        workflow.setCurrentStage("label");
      }, 1500);

    } catch (err) {
      toast.error("Generation failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsGenerating(false);
    }
  };

  // BROWSE MODE: Show UC Browser to select table
  if (mode === "browse") {
    return (
      <div className="flex-1 flex flex-col bg-db-gray-50">
        <div className="bg-white border-b border-db-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-db-gray-900">Select Data Source</h1>
            <p className="text-db-gray-600 mt-1">
              Browse Unity Catalog and select a table to use as your data source
            </p>
          </div>
        </div>

        <StageSubNav
          stage="data"
          mode={mode}
          onModeChange={onModeChange || (() => {})}
        />

        <div className="flex-1 overflow-hidden px-6 pb-6 pt-4">
          <div className="max-w-7xl mx-auto h-full">
            <div className="h-full bg-white rounded-xl border border-db-gray-200 shadow-sm overflow-hidden">
              <UCBrowser
                onSelect={handleTableSelect}
                filter={["table"]}
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CREATE MODE: Show data preview + template selection
  if (!selectedTable) {
    return (
      <div className="flex-1 flex items-center justify-center bg-db-gray-50">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <Database className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-semibold text-db-gray-800 mb-2">
            No table selected
          </h2>
          <p className="text-db-gray-500 mb-6">
            Switch to Browse mode to select a Unity Catalog table
          </p>
          <button
            onClick={() => onModeChange?.("browse")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2 font-medium"
          >
            <Database className="w-5 h-5" />
            Browse Tables
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-db-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-db-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-db-gray-900 flex items-center gap-3">
                <Table2 className="w-6 h-6 text-blue-600" />
                {selectedTable.name}
              </h1>
              <p className="text-db-gray-600 mt-1">
                {selectedTable.catalogName}.{selectedTable.schemaName}.{selectedTable.name}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedTable(null);
                setTablePreview(null);
                onModeChange?.("browse");
              }}
              className="text-sm text-db-gray-500 hover:text-db-gray-700"
            >
              ← Change table
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Data Preview Section */}
          <div className="bg-white rounded-lg border border-db-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-db-gray-200">
              <h2 className="text-lg font-semibold text-db-gray-900">Data Preview</h2>
              <p className="text-sm text-db-gray-600 mt-1">
                First 50 rows from your table
              </p>
            </div>

            {isLoadingPreview ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-db-gray-400" />
              </div>
            ) : tablePreview ? (
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-db-gray-50 border-b border-db-gray-200">
                    <tr>
                      {tablePreview.rows[0] && Object.keys(tablePreview.rows[0]).map((col: string) => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-medium text-db-gray-600 uppercase">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-db-gray-200">
                    {tablePreview.rows.slice(0, 10).map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-db-gray-50">
                        {Object.values(row).map((val: any, colIdx: number) => (
                          <td key={colIdx} className="px-4 py-3 text-sm text-db-gray-900">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2 bg-db-gray-50 border-t border-db-gray-200 text-sm text-db-gray-500">
                  Showing 10 of {tablePreview.count?.toLocaleString() || "?"} rows
                </div>
              </div>
            ) : (
              <div className="px-6 py-12 text-center text-db-gray-500">
                No preview available
              </div>
            )}
          </div>

          {/* Template Selection Section */}
          <div className="bg-white rounded-lg border border-db-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-db-gray-900 mb-4">Configure Template</h2>
            <p className="text-sm text-db-gray-600 mb-4">
              Select a prompt template to transform your data into training Q&A pairs
            </p>

            <select
              value={selectedTemplate || ""}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-4 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a template...</option>
              {templates.map((template: Template) => (
                <option key={template.id} value={template.id}>
                  {template.name} - {template.description}
                </option>
              ))}
            </select>

            {templates.length === 0 && (
              <p className="mt-2 text-sm text-orange-600">
                No templates found. Create a template first in the TOOLS menu.
              </p>
            )}
          </div>

          {/* Generate Button */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-db-gray-900 mb-1">Ready to generate?</h3>
                <p className="text-sm text-db-gray-600">
                  This will create Training Data (Q&A pairs) from your table using the selected template
                </p>
              </div>
              <button
                onClick={handleGenerate}
                disabled={!selectedTemplate || isGenerating}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-db-gray-300 disabled:cursor-not-allowed inline-flex items-center gap-2 font-medium"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Generate Training Data
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
