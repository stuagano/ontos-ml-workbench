# Chart Components

Reusable Recharts-based visualization components for the Ontos ML Workbench monitoring dashboard.

## Overview

All chart components follow these principles:
- **Responsive**: Use `ResponsiveContainer` to adapt to different screen sizes
- **Themed**: Consistent Databricks color scheme (cyan-600, rose-600, indigo-600, etc.)
- **Accessible**: Proper tooltips and labels
- **Stateful**: Built-in loading and empty states
- **Typed**: Full TypeScript support

## Components

### MetricsLineChart

Time series line chart for tracking metrics over time (latency, throughput, etc.).

**Features:**
- Multiple data series support
- Time range filtering
- Custom formatters for Y-axis and tooltips
- Optional legend

**Usage:**

```tsx
import { MetricsLineChart, MetricSeries } from "./components/charts";

const series: MetricSeries[] = [
  {
    name: "Requests/min",
    data: [
      { timestamp: "2024-02-07T10:00:00Z", value: 1200 },
      { timestamp: "2024-02-07T11:00:00Z", value: 1350 },
      // ...
    ],
    color: "cyan-600",
    strokeWidth: 2,
  },
  {
    name: "Errors/min",
    data: [
      { timestamp: "2024-02-07T10:00:00Z", value: 5 },
      { timestamp: "2024-02-07T11:00:00Z", value: 3 },
      // ...
    ],
    color: "rose-600",
  },
];

<MetricsLineChart
  series={series}
  height={300}
  yAxisLabel="Requests"
  formatYAxis={(value) => `${value}`}
  formatTooltip={(value) => `${value} req/min`}
  showLegend={true}
  showGrid={true}
/>
```

### DistributionBarChart

Bar chart for showing distributions (categorical data, counts, percentages).

**Features:**
- Vertical or horizontal layout
- Per-bar custom colors
- Percentage or absolute value display
- Custom formatters

**Usage:**

```tsx
import { DistributionBarChart, DistributionDataPoint } from "./components/charts";

const data: DistributionDataPoint[] = [
  { category: "Critical", value: 5, color: "red-600" },
  { category: "High", value: 15, color: "amber-600" },
  { category: "Medium", value: 30, color: "indigo-600" },
  { category: "Low", value: 50, color: "green-600" },
];

<DistributionBarChart
  data={data}
  height={300}
  layout="vertical"
  defaultColor="indigo-600"
  formatValue={(value) => `${value}%`}
  showGrid={true}
/>
```

### SimpleAreaChart

Area chart for visualizing trends with gradient fill.

**Features:**
- Single data series
- Gradient fill effect
- Time-based X-axis
- Configurable opacity

**Usage:**

```tsx
import { SimpleAreaChart, AreaDataPoint } from "./components/charts";

const data: AreaDataPoint[] = [
  { timestamp: "2024-02-07T10:00:00Z", value: 180 },
  { timestamp: "2024-02-07T11:00:00Z", value: 195 },
  // ...
];

<SimpleAreaChart
  data={data}
  height={300}
  color="cyan-600"
  yAxisLabel="Latency (ms)"
  formatYAxis={(value) => `${value}ms`}
  formatTooltip={(value) => `${value}ms`}
  fillOpacity={0.3}
  showGrid={true}
/>
```

## Available Colors

Use these Tailwind color classes for consistent theming:

- `cyan-600` - Primary metric (throughput, requests)
- `rose-600` - Errors, critical alerts
- `indigo-600` - Secondary metrics
- `amber-600` - Warnings, cautions
- `green-600` - Success, healthy status
- `purple-600` - Cost, financial metrics
- `blue-600` - Information
- `red-600` - Failures, severe errors

## Loading and Empty States

All components support loading and empty states out of the box:

```tsx
// Loading state
<MetricsLineChart
  series={[]}
  loading={true}
  height={300}
/>

// Empty state
<MetricsLineChart
  series={[]}
  empty={true}
  emptyMessage="No data available for this time range"
  height={300}
/>
```

## Time Range Filtering

The charts work seamlessly with time range selectors:

```tsx
const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d" | "30d">("24h");

// Generate data based on time range
const chartData = generateChartData(timeRange);

<MetricsLineChart series={chartData} height={300} />
```

## Responsive Design

All charts automatically adapt to container width:

```tsx
// Full width within container
<div className="w-full">
  <MetricsLineChart series={data} height={300} />
</div>

// Grid layout
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <MetricsLineChart series={data1} height={300} />
  <DistributionBarChart data={data2} height={300} />
</div>
```

## Custom Formatters

Format axis labels and tooltips to match your data:

```tsx
// Currency
formatYAxis={(value) => `$${value}`}
formatTooltip={(value) => `$${value.toFixed(2)}`}

// Percentage
formatYAxis={(value) => `${value}%`}
formatTooltip={(value) => `${value.toFixed(1)}%`}

// Time
formatYAxis={(value) => `${value}ms`}
formatTooltip={(value) => `${value}ms avg`}

// Abbreviated numbers
formatYAxis={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : `${value}`}
```

## Testing

Chart components are designed to be testable:

```tsx
import { render, screen } from "@testing-library/react";
import { MetricsLineChart } from "./MetricsLineChart";

test("renders empty state", () => {
  render(<MetricsLineChart series={[]} empty={true} height={300} />);
  expect(screen.getByText("No data available")).toBeInTheDocument();
});

test("renders loading state", () => {
  render(<MetricsLineChart series={[]} loading={true} height={300} />);
  expect(screen.getByText("Loading metrics...")).toBeInTheDocument();
});
```

## Performance Considerations

- Limit data points to 50-100 for optimal rendering performance
- Use `showGrid={false}` for simpler charts when grid is not needed
- Consider `showLegend={false}` for single-series charts
- Debounce time range changes to avoid excessive re-renders

## Browser Compatibility

Charts are tested and work correctly in:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Dependencies

- **recharts**: ^3.7.0 - Chart rendering library
- **React**: ^18.2.0
- **TypeScript**: ^5.2.2
