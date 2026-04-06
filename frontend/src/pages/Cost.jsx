import { useState } from 'react';
import { API } from '../services/api';
import { CircleDollarSign, CalendarDays, BarChart2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';

const tooltipStyle = {
  backgroundColor: '#ffffff',
  titleColor: '#111827',
  bodyColor: '#1f2937',
  borderColor: '#d1d5db',
  borderWidth: 1,
  padding: 10,
  cornerRadius: 6,
  caretSize: 6,
  displayColors: true,
};

const darkScales = {
  x: { grid: { display: false }, ticks: { color: '#545980', font: { size: 11 } }, border: { display: false } },
  y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#545980', font: { size: 11 } }, border: { display: false } },
};

function KpiCard({ title, value, sub, icon: Icon, color, bg }) {
  return (
    <div className="kpi-card">
      <div className="kpi-accent" style={{ background: color }} />
      <div className="kpi-gradient" style={{ background: `radial-gradient(ellipse at top right, ${bg} 0%, transparent 70%)` }} />
      <div className="kpi-title">{title}</div>
      <div className="kpi-value" style={{ color }}>
        {value === null ? <div className="skeleton" style={{ width: '80px', height: '24px' }} /> : value}
      </div>
      <div className="kpi-sub">{sub}</div>
      <div className="kpi-icon" style={{ background: bg, color }}>
        <Icon size={18} />
      </div>
    </div>
  );
}

export default function Cost() {
  const [householdId, setHouseholdId] = useState('MAC000002');
  const [fromDate, setFromDate]       = useState('');
  const [toDate, setToDate]           = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [costData, setCostData]       = useState(null);
  const [benchData, setBenchData]     = useState(null);

  const handleLoad = async () => {
    if (!householdId.trim()) { setError('Enter a Household ID'); return; }
    setLoading(true); setError(null);
    try {
      const [cost, bench] = await Promise.all([
        API.householdCost(householdId, fromDate, toDate),
        API.householdBenchmark(householdId),
      ]);
      if (cost.error || bench.error) {
        setError(cost.error || bench.error);
        setCostData(null); setBenchData(null);
      } else {
        setCostData(cost); setBenchData(bench);
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const renderContent = () => {
    if (loading) return (
      <div className="loading-panel">
        <div className="loading-content">
          <div className="loading-spinner" />
          <h3>Loading cost and benchmark data…</h3>
        </div>
      </div>
    );

    if (error) return (
      <div className="error-panel">
        <div className="error-content">
          <AlertCircle size={48} />
          <h3>Error Loading Data</h3>
          <p>{error}</p>
        </div>
      </div>
    );

    if (!costData || !benchData) return (
      <div className="empty-state-panel">
        <div className="empty-state-content">
          <CircleDollarSign size={48} />
          <h3>Enter a Household ID and click Load Data</h3>
          <p>See estimated energy costs and how this household compares to its ACORN peer group</p>
        </div>
      </div>
    );

    const pctVsAvg = benchData.pct_vs_group_avg || 0;
    const isAbove  = pctVsAvg > 0;
    const aboveColor = isAbove ? '#f43f5e' : '#10b981';
    const daily    = costData.daily || [];

    const lineOpts = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { color: '#7b82b0', usePointStyle: true, boxWidth: 6, font: { size: 12 }, padding: 12 } },
        tooltip: { ...tooltipStyle },
      },
      scales: {
        x:  { grid: { display: false }, ticks: { color: '#545980', font: { size: 11 } }, border: { display: false } },
        y1: { position: 'left',  grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#545980', font: { size: 11 } }, border: { display: false } },
        y2: { position: 'right', grid: { display: false }, ticks: { color: '#545980', font: { size: 11 } }, border: { display: false } },
      },
    };

    const barOpts = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { ...tooltipStyle } },
      scales: darkScales,
    };

    return (
      <div className="animate-fade-in">
        <div className="kpi-grid">
          <KpiCard title="Total Cost"      value={`£${costData.total_cost_gbp?.toFixed(2)}`}    sub={`${costData.total_kwh?.toFixed(0)} kWh total`}                 icon={CircleDollarSign} color="#10b981" bg="rgba(16,185,129,0.12)" />
          <KpiCard title="Avg Daily Cost"  value={`£${costData.avg_daily_cost_gbp?.toFixed(3)}`} sub={`${costData.tariff_type} @ £${costData.rate_per_kwh}/kWh`}    icon={CalendarDays}     color="#a855f7" bg="rgba(168,85,247,0.12)" />
          <KpiCard title="Peer Percentile" value={`${Math.round(benchData.percentile_rank || 0)}th`} sub={`${benchData.peer_count} peers in ${benchData.acorn_group}`} icon={BarChart2}         color="#06b6d4" bg="rgba(6,182,212,0.12)" />
          <KpiCard title="Vs Group Avg"    value={`${isAbove ? '+' : ''}${pctVsAvg.toFixed(1)}%`} sub={`${Math.abs(pctVsAvg).toFixed(1)}% ${isAbove ? 'above' : 'below'} peers`} icon={isAbove ? TrendingUp : TrendingDown} color={aboveColor} bg={isAbove ? 'rgba(244,63,94,0.12)' : 'rgba(16,185,129,0.12)'} />
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <div className="chart-header">
              <h3>Cumulative Cost Over Time ({costData.tariff_type})</h3>
            </div>
            <div className="chart-container">
              <Line
                options={lineOpts}
                data={{
                  labels: daily.map(d => d.reading_date?.slice(5)),
                  datasets: [
                    { label: 'Cumulative Cost (£)', data: daily.map(d => d.cumulative_cost_gbp), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)', fill: true, tension: 0.4, yAxisID: 'y1', pointRadius: 0, borderWidth: 2.5 },
                    { label: 'Daily Cost (£)',       data: daily.map(d => d.daily_cost_gbp),      borderColor: '#a855f7', backgroundColor: 'transparent',              fill: false, tension: 0.4, yAxisID: 'y2', pointRadius: 0, borderWidth: 2 },
                  ],
                }}
              />
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3>ACORN Peer Comparison ({benchData.acorn_group})</h3>
            </div>
            <div className="comparison-highlight" style={{ background: isAbove ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)', borderLeftColor: aboveColor }}>
              <div className="comparison-title" style={{ color: aboveColor }}>{benchData.comparison_label}</div>
              <div className="comparison-details">
                Your avg: <strong>{benchData.own_avg_kwh?.toFixed(3)} kWh/day</strong>
                {' · '}
                Group avg: <strong>{benchData.group_avg_kwh?.toFixed(3)} kWh/day</strong>
              </div>
            </div>
            <div className="chart-container">
              <Bar
                options={barOpts}
                data={{
                  labels: ['This Household', 'Group Min', 'Group Median', 'Group Avg', 'Group Max'],
                  datasets: [{
                    data: [benchData.own_avg_kwh, benchData.group_min_kwh, benchData.group_median_kwh, benchData.group_avg_kwh, benchData.group_max_kwh],
                    backgroundColor: [isAbove ? 'rgba(244,63,94,0.8)' : 'rgba(16,185,129,0.8)', 'rgba(16,185,129,0.5)', 'rgba(6,182,212,0.5)', 'rgba(6,182,212,0.7)', 'rgba(245,158,11,0.5)'],
                    borderRadius: 6,
                  }],
                }}
              />
            </div>
          </div>
        </div>

        <div className="cost-table-panel">
          <div className="table-header">
            <h3>Daily Cost Breakdown</h3>
          </div>
          <div className="table-container">
            <table className="cost-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Energy (kWh)</th>
                  <th>Daily Cost</th>
                  <th>Cumulative Cost</th>
                  <th>Tariff</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((d, i) => (
                  <tr key={i} className="cost-row">
                    <td className="date-cell">{d.reading_date}</td>
                    <td className="energy-cell">{d.energy_kwh?.toFixed(4)}</td>
                    <td className="daily-cost-cell">£{d.daily_cost_gbp?.toFixed(4)}</td>
                    <td className="cumulative-cost-cell">£{d.cumulative_cost_gbp?.toFixed(2)}</td>
                    <td>
                      <span className={`tariff-badge ${d.tariff_type === 'ToU' ? 'tou' : 'standard'}`}>
                        {d.tariff_type}
                      </span>
                    </td>
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
      <h1 className="page-title">Cost Estimation & Peer Benchmarking</h1>

      <div className="cost-form-panel">
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Household ID</label>
            <input
              type="text"
              className="form-input"
              value={householdId}
              onChange={e => setHouseholdId(e.target.value)}
              placeholder="e.g. MAC000002"
            />
          </div>
          <div className="form-group">
            <label className="form-label">From Date</label>
            <input
              type="date"
              className="form-input"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">To Date</label>
            <input
              type="date"
              className="form-input"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button
              className={`cost-btn ${loading ? 'disabled' : 'primary'}`}
              onClick={handleLoad}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load Data'}
            </button>
          </div>
        </div>
      </div>

      {renderContent()}
    </div>
  );
}