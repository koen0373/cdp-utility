import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface AssetAllocation {
  name: string;
  value: number;
}

interface PortfolioAllocationChartProps {
  assets: AssetAllocation[];
  coindepoValue: number;
  loansValue: number;
  formatCurrency: (value: number) => string;
}

// Color palette for different assets
const ASSET_COLORS = [
  { bg: 'rgba(249, 115, 22, 0.8)', border: 'rgba(249, 115, 22, 1)' },    // Orange
  { bg: 'rgba(99, 102, 241, 0.8)', border: 'rgba(99, 102, 241, 1)' },    // Indigo
  { bg: 'rgba(16, 185, 129, 0.8)', border: 'rgba(16, 185, 129, 1)' },    // Green
  { bg: 'rgba(236, 72, 153, 0.8)', border: 'rgba(236, 72, 153, 1)' },    // Pink
  { bg: 'rgba(14, 165, 233, 0.8)', border: 'rgba(14, 165, 233, 1)' },    // Sky
  { bg: 'rgba(168, 85, 247, 0.8)', border: 'rgba(168, 85, 247, 1)' },    // Purple
  { bg: 'rgba(234, 179, 8, 0.8)', border: 'rgba(234, 179, 8, 1)' },      // Yellow
  { bg: 'rgba(239, 68, 68, 0.8)', border: 'rgba(239, 68, 68, 1)' },      // Red
];

export const PortfolioAllocationChart: React.FC<PortfolioAllocationChartProps> = ({
  assets,
  coindepoValue,
  loansValue,
  formatCurrency
}) => {
  // Combine all holdings
  const allHoldings = [
    ...assets.map(a => ({ name: a.name, value: a.value })),
    ...(coindepoValue > 0 ? [{ name: 'COINDEPO', value: coindepoValue }] : []),
    ...(loansValue > 0 ? [{ name: 'Loans (Debt)', value: loansValue }] : [])
  ];

  const total = allHoldings.reduce((sum, h) => sum + h.value, 0);

  const data = {
    labels: allHoldings.map(h => h.name),
    datasets: [
      {
        data: allHoldings.map(h => h.value),
        backgroundColor: allHoldings.map((h, i) => {
          if (h.name === 'COINDEPO') return 'rgba(37, 99, 235, 0.8)';
          if (h.name === 'Loans (Debt)') return 'rgba(220, 38, 38, 0.8)';
          return ASSET_COLORS[i % ASSET_COLORS.length].bg;
        }),
        borderColor: allHoldings.map((h, i) => {
          if (h.name === 'COINDEPO') return 'rgba(37, 99, 235, 1)';
          if (h.name === 'Loans (Debt)') return 'rgba(220, 38, 38, 1)';
          return ASSET_COLORS[i % ASSET_COLORS.length].border;
        }),
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false, // Hide chart legend since we'll show it separately
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${label}: ${formatCurrency(value)} (${percent}%)`;
          }
        }
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-center">
      {/* Legend and Percentages - Left Side */}
      <div className="flex-1 w-full lg:w-auto">
        <div className="space-y-3">
          {allHoldings.map((holding, index) => {
            const percent = total > 0 ? ((holding.value / total) * 100).toFixed(1) : '0';
            const isLoan = holding.name === 'Loans (Debt)';
            const isCoindepo = holding.name === 'COINDEPO';
            
            // Get color for this holding
            let color = ASSET_COLORS[index % ASSET_COLORS.length].bg;
            if (isCoindepo) color = 'rgba(37, 99, 235, 0.8)';
            if (isLoan) color = 'rgba(220, 38, 38, 0.8)';
            
            return (
              <div 
                key={holding.name} 
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50"
              >
                {/* Color indicator */}
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                ></div>
                
                {/* Asset info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">{holding.name}</div>
                  <div className="text-xs text-slate-500">{formatCurrency(holding.value)}</div>
                </div>
                
                {/* Percentage */}
                <div className={`text-lg font-bold ${
                  isLoan ? 'text-red-600' : 
                  isCoindepo ? 'text-blue-600' : 
                  'text-slate-700'
                }`}>
                  {percent}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pie Chart - Right Side */}
      <div className="flex-shrink-0">
        <div className="w-64 h-64">
          <Pie data={data} options={options} />
        </div>
      </div>
    </div>
  );
};

