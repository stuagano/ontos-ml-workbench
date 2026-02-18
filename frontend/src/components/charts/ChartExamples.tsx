/**
 * ChartExamples - Demonstration of chart components
 *
 * This file shows example usage of all chart components.
 * Use these as reference when implementing charts in your pages.
 *
 * To view this demo, temporarily import it in a page component.
 */

import { useState } from "react";
import { MetricsLineChart, DistributionBarChart, SimpleAreaChart } from "./index";
import type { MetricSeries, DistributionDataPoint, AreaDataPoint } from "./index";

export function ChartExamples() {
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d">("24h");

  // Generate sample data for MetricsLineChart
  const generateTimeSeriesData = () => {
    const now = new Date();
    const points = 24;
    const requests: Array<{ timestamp: string; value: number }> = [];
    const errors: Array<{ timestamp: string; value: number }> = [];

    for (let i = points; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000).toISOString();
      requests.push({
        timestamp,
        value: 1000 + Math.random() * 500 + Math.sin(i * 0.5) * 200,
      });
      errors.push({
        timestamp,
        value: Math.random() * 10 + Math.sin(i * 0.3) * 5,
      });
    }

    const series: MetricSeries[] = [
      {
        name: "Requests/min",
        data: requests,
        color: "cyan-600",
        strokeWidth: 2,
      },
      {
        name: "Errors/min",
        data: errors,
        color: "rose-600",
        strokeWidth: 2,
      },
    ];

    return series;
  };

  // Sample data for DistributionBarChart
  const severityDistribution: DistributionDataPoint[] = [
    { category: "Critical", value: 5, color: "red-600" },
    { category: "High", value: 15, color: "amber-600" },
    { category: "Medium", value: 35, color: "indigo-600" },
    { category: "Low", value: 45, color: "green-600" },
  ];

  // Sample data for SimpleAreaChart
  const generateLatencyData = (): AreaDataPoint[] => {
    const now = new Date();
    const points = 20;
    const data: AreaDataPoint[] = [];

    for (let i = points; i >= 0; i--) {
      data.push({
        timestamp: new Date(now.getTime() - i * 60 * 60 * 1000).toISOString(),
        value: 150 + Math.random() * 50 + Math.sin(i * 0.4) * 30,
      });
    }

    return data;
  };

  return (
    <div className="p-6 space-y-8 bg-db-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-db-gray-900 mb-2">
          Chart Components Examples
        </h1>
        <p className="text-db-gray-600 mb-8">
          Demonstration of all available chart components with sample data
        </p>

        {/* Time Range Selector */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm font-medium text-db-gray-700">Time Range:</span>
          <div className="flex items-center gap-1 bg-db-gray-100 p-1 rounded-lg">
            {(["1h", "24h", "7d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeRange === range
                    ? "bg-white text-db-gray-800 shadow-sm"
                    : "text-db-gray-500 hover:text-db-gray-700"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* MetricsLineChart Example */}
        <div className="bg-white rounded-lg border border-db-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-db-gray-800 mb-4">
            MetricsLineChart - Multiple Series
          </h2>
          <p className="text-sm text-db-gray-600 mb-4">
            Time series chart with multiple metrics. Perfect for tracking requests,
            latency, throughput over time.
          </p>
          <MetricsLineChart
            series={generateTimeSeriesData()}
            height={300}
            yAxisLabel="Count"
            formatYAxis={(value) => `${Math.floor(value)}`}
            formatTooltip={(value) => `${Math.floor(value)} /min`}
            showLegend={true}
            showGrid={true}
          />
        </div>

        {/* DistributionBarChart Example - Vertical */}
        <div className="bg-white rounded-lg border border-db-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-db-gray-800 mb-4">
            DistributionBarChart - Vertical Layout
          </h2>
          <p className="text-sm text-db-gray-600 mb-4">
            Bar chart showing distribution across categories. Each bar can have a
            custom color.
          </p>
          <DistributionBarChart
            data={severityDistribution}
            height={300}
            layout="vertical"
            defaultColor="indigo-600"
            yAxisLabel="Severity"
            xAxisLabel="Count"
            formatValue={(value) => `${value}%`}
            showGrid={true}
          />
        </div>

        {/* DistributionBarChart Example - Horizontal */}
        <div className="bg-white rounded-lg border border-db-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-db-gray-800 mb-4">
            DistributionBarChart - Horizontal Layout
          </h2>
          <p className="text-sm text-db-gray-600 mb-4">
            Same data as above, but with horizontal layout for better label readability.
          </p>
          <DistributionBarChart
            data={severityDistribution}
            height={300}
            layout="horizontal"
            defaultColor="indigo-600"
            xAxisLabel="Severity"
            yAxisLabel="Percentage"
            formatValue={(value) => `${value}%`}
            showGrid={true}
          />
        </div>

        {/* SimpleAreaChart Example */}
        <div className="bg-white rounded-lg border border-db-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-db-gray-800 mb-4">
            SimpleAreaChart - Trend Visualization
          </h2>
          <p className="text-sm text-db-gray-600 mb-4">
            Area chart with gradient fill. Great for showing trends like latency,
            temperature, or cost over time.
          </p>
          <SimpleAreaChart
            data={generateLatencyData()}
            height={300}
            color="cyan-600"
            yAxisLabel="Latency (ms)"
            formatYAxis={(value) => `${Math.floor(value)}ms`}
            formatTooltip={(value) => `${Math.floor(value)}ms`}
            fillOpacity={0.3}
            showGrid={true}
          />
        </div>

        {/* Loading State Example */}
        <div className="bg-white rounded-lg border border-db-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-db-gray-800 mb-4">
            Loading State
          </h2>
          <p className="text-sm text-db-gray-600 mb-4">
            All charts have built-in loading states with spinners.
          </p>
          <MetricsLineChart
            series={[]}
            height={200}
            loading={true}
          />
        </div>

        {/* Empty State Example */}
        <div className="bg-white rounded-lg border border-db-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-db-gray-800 mb-4">
            Empty State
          </h2>
          <p className="text-sm text-db-gray-600 mb-4">
            All charts handle empty data gracefully with clear messaging.
          </p>
          <SimpleAreaChart
            data={[]}
            height={200}
            empty={true}
            emptyMessage="No latency data available for this time range"
            color="indigo-600"
          />
        </div>

        {/* Grid Layout Example */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-db-gray-800 mb-4">
            Grid Layout - Multiple Charts
          </h2>
          <p className="text-sm text-db-gray-600 mb-4">
            Charts work well in grid layouts and automatically adapt to container width.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-db-gray-200 p-4">
              <h3 className="text-sm font-semibold text-db-gray-700 mb-3">
                Request Volume
              </h3>
              <SimpleAreaChart
                data={generateLatencyData()}
                height={200}
                color="cyan-600"
                formatYAxis={(value) => `${Math.floor(value)}`}
                formatTooltip={(value) => `${Math.floor(value)} req/min`}
              />
            </div>
            <div className="bg-white rounded-lg border border-db-gray-200 p-4">
              <h3 className="text-sm font-semibold text-db-gray-700 mb-3">
                Error Distribution
              </h3>
              <DistributionBarChart
                data={severityDistribution}
                height={200}
                layout="horizontal"
                defaultColor="rose-600"
              />
            </div>
          </div>
        </div>

        {/* Color Palette Reference */}
        <div className="bg-white rounded-lg border border-db-gray-200 p-6">
          <h2 className="text-xl font-semibold text-db-gray-800 mb-4">
            Available Color Palette
          </h2>
          <p className="text-sm text-db-gray-600 mb-4">
            Use these Tailwind color classes for consistent theming across charts.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Cyan", class: "cyan-600", usage: "Primary metrics" },
              { name: "Rose", class: "rose-600", usage: "Errors, critical" },
              { name: "Indigo", class: "indigo-600", usage: "Secondary metrics" },
              { name: "Amber", class: "amber-600", usage: "Warnings" },
              { name: "Green", class: "green-600", usage: "Success, healthy" },
              { name: "Purple", class: "purple-600", usage: "Cost, financial" },
              { name: "Blue", class: "blue-600", usage: "Information" },
              { name: "Red", class: "red-600", usage: "Failures, severe" },
            ].map((color) => (
              <div key={color.class} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded bg-${color.class}`} />
                <div>
                  <div className="text-sm font-medium text-db-gray-800">
                    {color.name}
                  </div>
                  <div className="text-xs text-db-gray-500">{color.usage}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
