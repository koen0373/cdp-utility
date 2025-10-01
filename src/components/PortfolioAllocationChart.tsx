import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PortfolioAllocationChartProps {
  assetsValue: number;
  coindepoValue: number;
  loansValue: number;
  formatCurrency: (value: number) => string;
}

export const PortfolioAllocationChart: React.FC<PortfolioAllocationChartProps> = ({
  assetsValue,
  coindepoValue,
  loansValue,
  formatCurrency
}) => {
  const total = assetsValue + coindepoValue;
  const assetsPercent = total > 0 ? (assetsValue / total) * 100 : 0;
  const coindepoPercent = total > 0 ? (coindepoValue / total) * 100 : 0;

  const data = {
    labels: ['Other Assets', 'COINDEPO Holdings', ...(loansValue > 0 ? ['Loans (Debt)'] : [])],
    datasets: [
      {
        data: loansValue > 0 
          ? [assetsValue, coindepoValue, loansValue]
          : [assetsValue, coindepoValue],
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',   // Indigo for assets
          'rgba(37, 99, 235, 0.8)',    // Blue for COINDEPO
          ...(loansValue > 0 ? ['rgba(220, 38, 38, 0.8)'] : [])  // Red for loans
        ],
        borderColor: [
          'rgba(99, 102, 241, 1)',
          'rgba(37, 99, 235, 1)',
          ...(loansValue > 0 ? ['rgba(220, 38, 38, 1)'] : [])
        ],
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
      <div className="max-w-xs mx-auto">
        <Pie data={data} options={options} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="bg-indigo-50 rounded-lg p-3">
          <div className="text-xs text-slate-600 mb-1">Other Assets</div>
          <div className="text-base font-bold text-indigo-600">{assetsPercent.toFixed(1)}%</div>
          <div className="text-xs text-slate-500">{formatCurrency(assetsValue)}</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-xs text-slate-600 mb-1">COINDEPO</div>
          <div className="text-base font-bold text-blue-600">{coindepoPercent.toFixed(1)}%</div>
          <div className="text-xs text-slate-500">{formatCurrency(coindepoValue)}</div>
        </div>
      </div>
      
      {loansValue > 0 && (
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-600 mb-1">Total Loans (Debt)</div>
          <div className="text-base font-bold text-red-600">{formatCurrency(loansValue)}</div>
        </div>
      )}
    </div>
  );
};

