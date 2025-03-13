import React from 'react';
import { BranchPieChart } from './BranchPieChart';
import { TopSalespeopleChart } from './TopSalespeopleChart';
import { AccumulatedRevenueChart } from './AccumulatedRevenueChart';

interface BranchChartData {
  name: string;
  value: number;
  margin: string;
  fill: string;
}

interface SalespersonData {
  name: string;
  value: number;
  margin: string;
  fill: string;
}

interface AccumulatedRevenueData {
  date: string;
  accumulated_revenue: number;
  accumulated_target: number;
  forecast_revenue: number;
  is_weekend: boolean;
}

interface OverviewTabProps {
  branchChartData: BranchChartData[];
  topSalespeopleData: SalespersonData[];
  topSalespeopleChartConfig: Record<string, { label: string, color: string }>;
  accumulatedRevenueData: AccumulatedRevenueData[];
}

export function OverviewTab({ 
  branchChartData, 
  topSalespeopleData, 
  topSalespeopleChartConfig,
  accumulatedRevenueData
}: OverviewTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <BranchPieChart branchChartData={branchChartData} />
        <TopSalespeopleChart 
          topSalespeopleData={topSalespeopleData} 
          topSalespeopleChartConfig={topSalespeopleChartConfig} 
        />
      </div>

      {/* Accumulated Revenue Chart */}
      <AccumulatedRevenueChart accumulatedRevenueData={accumulatedRevenueData} />
    </div>
  );
} 