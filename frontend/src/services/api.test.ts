/**
 * Unit tests for API service layer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as api from './api';
import type {
  SheetCreateRequest,
  CanonicalLabelCreateRequest,
  TrainingJobCreateRequest,
} from '../types';

// Type-safe mock for fetch
const mockFetch = vi.fn();

describe('API Service', () => {
  beforeEach(() => {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Config', () => {
    it('should fetch app config', async () => {
      const mockConfig = {
        app_name: 'Ontos ML Workbench',
        catalog: 'main',
        schema: 'ontos_ml_workbench',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      const result = await api.getConfig();
      expect(result).toEqual(mockConfig);
    });
  });

  describe('Sheets API', () => {
    it('should list sheets', async () => {
      const mockSheets = {
        sheets: [
          { id: 'sheet-1', name: 'Defect Detection', status: 'active' },
        ],
        total: 1,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSheets,
      });

      const result = await api.listSheets();
      expect(result).toEqual(mockSheets);
    });

    it('should create sheet', async () => {
      const payload: SheetCreateRequest = {
        name: 'Test Sheet',
        source_type: 'uc_table',
        source_table: 'main.test.data',
      };
      const mockResponse = { id: 'sheet-1', ...payload };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.createSheet(payload);
      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sheets'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should get sheet by ID', async () => {
      const mockSheet = { id: 'sheet-1', name: 'Test Sheet' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSheet,
      });

      const result = await api.getSheet('sheet-1');
      expect(result).toEqual(mockSheet);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Not found' }),
      });

      await expect(api.getSheet('nonexistent')).rejects.toThrow();
    });
  });

  describe('Templates API', () => {
    it('should list templates', async () => {
      const mockResponse = {
        templates: [
          { id: 'template-1', name: 'Defect Classifier', label_type: 'defect_type' },
        ],
        total: 1,
        page: 1,
        page_size: 10,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.listTemplates();
      expect(result).toEqual(mockResponse);
    });

    it('should create template', async () => {
      const payload = {
        name: 'Test Template',
        label_type: 'classification',
        prompt_template: 'Classify: {{text}}',
      };
      const mockResponse = { id: 'template-1', ...payload };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.createTemplate(payload);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Canonical Labels API', () => {
    it('should create canonical label', async () => {
      const payload: CanonicalLabelCreateRequest = {
        sheet_id: 'sheet-1',
        item_ref: 'item_001',
        label_type: 'defect_type',
        label_data: { defect: 'crack' },
        labeled_by: 'expert@example.com',
      };
      const mockResponse = { id: 'label-1', ...payload };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.createCanonicalLabel(payload);
      expect(result).toEqual(mockResponse);
    });

    it('should list canonical labels for sheet', async () => {
      const mockResponse = {
        labels: [
          { id: 'label-1', sheet_id: 'sheet-1', label_type: 'defect_type' },
        ],
        total: 1,
        page: 1,
        page_size: 10,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.listCanonicalLabels({ sheet_id: 'sheet-1' });
      expect(result).toEqual(mockResponse);
    });

    it('should get canonical label by ID', async () => {
      const mockLabel = { id: 'label-1', sheet_id: 'sheet-1', label_type: 'defect_type' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLabel,
      });

      const result = await api.getCanonicalLabel('label-1');
      expect(result).toEqual(mockLabel);
    });
  });

  describe('Training Jobs API', () => {
    it('should create training job', async () => {
      const payload: TrainingJobCreateRequest = {
        training_sheet_id: 'training-sheet-1',
        model_name: 'defect-classifier-v1',
        base_model: 'databricks-meta-llama-3-1-8b-instruct',
        training_config: { epochs: 3 },
        train_val_split: 0.8,
      };
      const mockResponse = { id: 'job-1', status: 'pending', ...payload };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.createTrainingJob(payload);
      expect(result).toEqual(mockResponse);
    });

    it('should list training jobs', async () => {
      const mockResponse = {
        jobs: [{ id: 'job-1', status: 'running' }],
        total: 1,
        page: 1,
        page_size: 10,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.listTrainingJobs();
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Training Sheet API', () => {
    it('should generate training sheet', async () => {
      const mockResponse = {
        training_sheet_id: 'ts-1',
        sheet_id: 'sheet-1',
        status: 'assembling',
        total_items: 100,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.generateTrainingSheet('sheet-1', { name: 'Test Training Sheet' });
      expect(result).toEqual(mockResponse);
    });

    it('should generate responses', async () => {
      const mockResponse = {
        training_sheet_id: 'ts-1',
        generated_count: 10,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.generateResponses('ts-1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(api.getConfig()).rejects.toThrow('Network error');
    });

    it('should handle 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      });

      await expect(api.listSheets()).rejects.toThrow();
    });

    it('should handle 500 server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'Internal server error' }),
      });

      await expect(api.listSheets()).rejects.toThrow();
    });
  });
});
