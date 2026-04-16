import { useState } from 'react';
import { API } from '../services/api';
import { TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import { Line } from 'react-chartjs-2';

const tooltipStyle = {
  backgroundColor: '#ffffff',
  titleColor: '#0d1b2e',
  bodyColor: '#64748b',
  borderColor: '#e2e8f4',
  borderWidth: 1,
  padding: 10,
};

function KpiCard({ title, value, sub, icon: Icon, color, bg }) {
  return (
    <div className="kpi-card glass-panel">
      <div className="kpi-accent" style={{ background: color }} />
      <div className="kpi-gradient" style={{ background: `radial-gradient(ellipse at top right, ${bg} 0%, transparent 70%)` }} />
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">
        {value === null ? <div className="skeleton" /> : value}
      </div>
      <div className="kpi-sub">{sub}</div>
      <div className="kpi-icon" style={{ background: bg, color }}>
        <Icon size={18} />
      </div>
    </div>
  );
}

export default function Forecast() {
  const [householdId, setHouseholdId] = useState('MAC000002');
  const [days, setDays]               = useState(30);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [forecastData, setForecastData] = useState(null);

  const handleRun = async () => {
    if (!householdId.trim()) return;
    setLoading(true); setError(null);
    try {
      const data = await API.forecast(householdId, days);
      if (!Array.isArray(data) || data.error) {
        setError(data?.error || 'Forecast failed. Make sure Prophet is installed.');
        setForecastData(null);
      } else {
        setForecastData(data);
      }
    } catch (e) { setError(e.message); setForecastData(null); }
    setLoading(false);
  };

  const renderContent = () => {
    if (loading) return (
      <div className="loading-panel glass-panel">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h3>Running Forecast Model</h3>
          <p>Processing <strong>{householdId}</strong> with Facebook Prophet ML model...</p>
        </div>
      </div>
    );

    if (error) return (
      <div className="error-panel glass-panel">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h3>Forecast Failed</h3>
          <p>{error}</p>
        </div>
      </div>
    );

    if (!forecastData) return (
      <div className="empty-state-panel glass-panel">
        <div className="empty-state-content">
          <BarChart2 size={56} />
          <h3>Ready to Forecast</h3>
          <p>Enter a Household ID and click Run Forecast to generate predictions</p>
          <span className="empty-state-subtitle">Uses Facebook Prophet ML for accurate energy consumption forecasting</span>
        </div>
      </div>
    );

    const preds  = forecastData.map(d => d.predicted_kwh);
    const avgP   = preds.reduce((a, b) => a + b, 0) / preds.length;
    const maxP   = Math.max(...preds);
    const minP   = Math.min(...preds);
    const isUp   = preds[preds.length - 1] > preds[0];

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#64748b',
            usePointStyle: true,
            boxWidth: 12,
            font: { size: 12 },
            padding: 16,
            filter: item => item.text === 'Forecast kWh'
          },
        },
        tooltip: { ...tooltipStyle },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { size: 11 } },
          border: { display: false },
          title: {
            display: true,
            text: 'Date',
            color: '#64748b',
            font: { size: 12, weight: 500 }
          }
        },
        y: {
          grid: { color: '#e2e8f4' },
          ticks: { color: '#64748b', font: { size: 11 } },
          border: { display: false },
          title: {
            display: true,
            text: 'Energy Consumption (kWh)',
            color: '#64748b',
            font: { size: 12, weight: 500 }
          }
        },
      },
    };

    return (
      <div className="forecast-results animate-fade-in">
        <div className="kpi-grid">
          <KpiCard title="Avg Predicted" value={avgP.toFixed(4)} sub="kWh per day" icon={BarChart2}   color="#7c3aed" bg="#f5f3ff" />
          <KpiCard title="Peak Day"      value={maxP.toFixed(4)} sub="kWh predicted" icon={TrendingUp}  color="#e11d48" bg="#fff1f2" />
          <KpiCard title="Min Day"       value={minP.toFixed(4)} sub="kWh predicted" icon={TrendingDown} color="#059669" bg="#ecfdf5" />
          <KpiCard title="Trend"         value={isUp ? 'Increasing' : 'Decreasing'} sub={`over ${days} days`} icon={isUp ? TrendingUp : TrendingDown} color={isUp ? '#e11d48' : '#059669'} bg={isUp ? '#fff1f2' : '#ecfdf5'} />
        </div>

        <div className="forecast-chart-panel glass-panel">
          <div className="chart-header">
            <h3>Energy Consumption Forecast</h3>
            <p className="chart-subtitle">
              {householdId} — {days}-day prediction from <strong>{forecastData[0]?.date}</strong> to <strong>{forecastData[forecastData.length - 1]?.date}</strong>
            </p>
          </div>
          <div className="chart-container">
            <Line
              options={chartOptions}
              data={{
                labels: forecastData.map(d => d.date?.slice(5)),
                datasets: [
                  {
                    label: 'Upper Bound',
                    data: forecastData.map(d => d.upper_bound),
                    borderColor: 'transparent',
                    backgroundColor: 'rgba(124,58,237,0.09)',
                    fill: '+1',
                    pointRadius: 0,
                    tension: 0.4,
                  },
                  {
                    label: 'Forecast kWh',
                    data: forecastData.map(d => d.predicted_kwh),
                    borderColor: '#7c3aed',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 3,
                  },
                  {
                    label: 'Lower Bound',
                    data: forecastData.map(d => d.lower_bound),
                    borderColor: 'transparent',
                    backgroundColor: 'rgba(255,255,255,1)',
                    fill: false,
                    pointRadius: 0,
                    tension: 0.4,
                  },
                ],
              }}
            />
          </div>
        </div>

        <div className="forecast-table-panel glass-panel">
          <div className="table-header">
            <h3>Forecast Data Details</h3>
            <p className="table-subtitle">Detailed predictions with confidence intervals</p>
          </div>
          <div className="table-container">
            <table className="forecast-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Predicted kWh</th>
                  <th>Lower Bound</th>
                  <th>Upper Bound</th>
                  <th>Uncertainty Range</th>
                </tr>
              </thead>
              <tbody>
                {forecastData.map((d, i) => (
                  <tr key={i} className="forecast-row">
                    <td className="date-cell">{d.date}</td>
                    <td className="predicted-cell">{d.predicted_kwh?.toFixed(4)}</td>
                    <td className="lower-cell">{d.lower_bound?.toFixed(4)}</td>
                    <td className="upper-cell">{d.upper_bound?.toFixed(4)}</td>
                    <td className="uncertainty-cell">± {((d.upper_bound - d.lower_bound) / 2).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Energy Forecasting</h1>
      </div>

      <div className="forecast-form-panel glass-panel">
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Household ID</label>
            <input
              type="text"
              value={householdId}
              onChange={e => setHouseholdId(e.target.value)}
              placeholder="e.g. MAC000002"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Forecast Days</label>
            <select
              value={days}
              onChange={e => setDays(parseInt(e.target.value))}
              className="form-select"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
          <div className="form-actions">
            <button
              onClick={handleRun}
              disabled={loading}
              className="forecast-btn primary"
            >
              Run Forecast
            </button>
          </div>
        </div>
      </div>

      {renderContent()}
    </div>
  );
}