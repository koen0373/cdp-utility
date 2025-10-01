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
        position: 'bottom' as const,
        labels: {
          padding: 15,
          font: {
            size: 12,
            family: "'Poppins', sans-serif"
          }
        }
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
    <div className="space-y-6">
      {/* Chart */}
      <div className="max-w-sm mx-auto">
        <Pie data={data} options={options} />
      </div>

      {/* Summary Stats - Show all holdings */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
        {allHoldings.map((holding) => {
          const percent = total > 0 ? ((holding.value / total) * 100).toFixed(1) : '0';
          const isLoan = holding.name === 'Loans (Debt)';
          const isCoindepo = holding.name === 'COINDEPO';
          
          return (
            <div 
              key={holding.name} 
              className={`rounded-lg p-3 ${
                isLoan ? 'bg-red-50' : 
                isCoindepo ? 'bg-blue-50' : 
                'bg-slate-50'
              }`}
            >
              <div className="text-xs text-slate-600 mb-1 truncate">{holding.name}</div>
              <div className={`text-base font-bold ${
                isLoan ? 'text-red-600' : 
                isCoindepo ? 'text-blue-600' : 
                'text-slate-700'
              }`}>
                {percent}%
              </div>
              <div className="text-xs text-slate-500">{formatCurrency(holding.value)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

