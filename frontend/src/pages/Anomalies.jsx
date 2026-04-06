import { useState, useEffect, useMemo } from 'react';
import { API } from '../services/api';
import { Siren, AlertTriangle, AlertCircle, Cpu } from 'lucide-react';
import { Doughnut, Bar } from 'react-chartjs-2';

const tooltipStyle = {
  backgroundColor: '#ffffff',
  titleColor: '#0d1b2e',
  bodyColor: '#64748b',
  borderColor: '#e2e8f4',
  borderWidth: 1,
  padding: 10,
};

const baseScales = {
  x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } }, border: { display: false } },
  y: { grid: { color: '#eef1f8' },  ticks: { color: '#94a3b8', font: { size: 11 } }, border: { display: false } },
};

function KpiCard({ title, value, sub, icon: Icon, color, bg }) {
  return (
    <div className="glass-panel" style={{ 
      padding: '24px', 
      position: 'relative', 
      overflow: 'hidden',
      transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      border: `1px solid ${color}20`,
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: `linear-gradient(90deg, ${color}, ${color}40)`, borderRadius: '14px 14px 0 0' }} />
      <div style={{ fontSize: '11px', fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', position: 'relative', opacity: 0.8 }}>{title}</div>
      <div style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1, marginBottom: '8px', color, letterSpacing: '-0.03em', position: 'relative' }}>
        {value === null ? <div className="skeleton" style={{ width: '80px', height: '28px' }} /> : value}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500, position: 'relative' }}>{sub}</div>
      <div style={{ 
        position: 'absolute', 
        top: '24px', 
        right: '24px', 
        width: '48px', 
        height: '48px', 
        borderRadius: '12px', 
        background: `linear-gradient(135deg, ${bg}, ${bg}80)`,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color,
        fontWeight: 600
      }}>
        <Icon size={24} />
      </div>
    </div>
  );
}

export default function Anomalies() {
  const [anomalies, setAnomalies]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [filterSev, setFilterSev]     = useState('');
  const [filterType, setFilterType]   = useState('');

  const loadAnomalies = async () => {
    setLoading(true); setError(null);
    try {
      const data = await API.anomalies();
      if (!Array.isArray(data) || data.error) {
        setError(data.error || 'Failed to load anomalies. The model may not be trained yet.');
        setAnomalies([]);
      } else {
        setAnomalies(data);
      }
    } catch (e) { setError(e.message); setAnomalies([]); }
    setLoading(false);
  };

  useEffect(() => { loadAnomalies(); }, []);

  const stats = useMemo(() => {
    if (!anomalies.length) return null;
    const critical = anomalies.filter(a => a.severity === 'CRITICAL').length;
    const high     = anomalies.filter(a => a.severity === 'HIGH').length;
    const medium   = anomalies.filter(a => a.severity === 'MEDIUM').length;
    const spike    = anomalies.filter(a => a.anomaly_type === 'SPIKE').length;
    const drop     = anomalies.filter(a => a.anomaly_type === 'DROP').length;
    const unusual  = anomalies.filter(a => a.anomaly_type === 'UNUSUAL_PATTERN').length;
    const buckets  = { '<-50%': 0, '-50 to 0%': 0, '0 to 100%': 0, '100 to 300%': 0, '>300%': 0 };
    anomalies.forEach(a => {
      const d = a.deviation_percent || 0;
      if (d < -50) buckets['<-50%']++;
      else if (d < 0) buckets['-50 to 0%']++;
      else if (d < 100) buckets['0 to 100%']++;
      else if (d < 300) buckets['100 to 300%']++;
      else buckets['>300%']++;
    });
    return { critical, high, medium, spike, drop, unusual, total: anomalies.length, buckets };
  }, [anomalies]);

  const filtered = useMemo(() =>
    anomalies.filter(a =>
      (!filterSev  || a.severity === filterSev) &&
      (!filterType || a.anomaly_type === filterType)
    ), [anomalies, filterSev, filterType]);


  const sevColor = s => s === 'CRITICAL' ? '#e11d48' : s === 'HIGH' ? '#d97706' : '#3b5bdb';
  const sevBg    = s => s === 'CRITICAL' ? '#fff1f2' : s === 'HIGH' ? '#fffbeb' : '#eef2ff';

  if (loading && !anomalies.length && !error)
    return <div className="page-container"><h1 className="page-title">Anomaly Detection</h1><div style={{ padding: '20px', color: 'var(--muted)' }}>Loading anomalies…</div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Anomaly Detection</h1>
        {/* Removed Train Model and Run Detection buttons */}

      </div>

      {error ? (
        <div className="error-panel glass-panel">
          <div className="error-content">
            <AlertCircle size={48} />
            <h3>Unable to Load Anomalies</h3>
            <p>{error}</p>
            <p className="error-subtitle">You may need to train the Isolation Forest model first.</p>
          </div>
        </div>
      ) : stats && (
        <div className="dashboard-content animate-fade-in">
          <div className="kpi-grid">
            <KpiCard title="Critical"       value={stats.critical} sub="Immediate attention" icon={Siren}         color="#e11d48" bg="#fff1f2" />
            <KpiCard title="High"           value={stats.high}     sub="Investigate soon"    icon={AlertTriangle} color="#d97706" bg="#fffbeb" />
            <KpiCard title="Medium"         value={stats.medium}   sub="Monitor closely"     icon={AlertCircle}   color="#3b5bdb" bg="#eef2ff" />
            <KpiCard title="Total Detected" value={stats.total}    sub="by Isolation Forest" icon={Cpu}           color="#059669" bg="#ecfdf5" />
          </div>

          <div className="charts-grid">
            <div className="chart-card glass-panel" style={{ border: '1px solid rgba(225,29,72,0.1)', transition: 'transform 0.3s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div className="chart-header">
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>Severity Breakdown</h3>
                <p className="chart-subtitle" style={{ fontSize: '12px', color: 'var(--muted)' }}>Distribution of anomaly severities</p>
              </div>
              <div className="chart-container">
                <Doughnut
                  options={{
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          color: '#64748b',
                          usePointStyle: true,
                          boxWidth: 12,
                          font: { size: 12 },
                          padding: 16,
                          generateLabels: (chart) => {
                            const data = chart.data;
                            return data.labels.map((label, i) => ({
                              text: `${label}: ${data.datasets[0].data[i]}`,
                              fillStyle: data.datasets[0].backgroundColor[i],
                              strokeStyle: data.datasets[0].backgroundColor[i],
                              lineWidth: 0,
                              hidden: false,
                              index: i
                            }));
                          }
                        }
                      },
                      tooltip: {
                        ...tooltipStyle,
                        callbacks: {
                          label: (context) => `${context.label}: ${context.parsed} (${((context.parsed / stats.total) * 100).toFixed(1)}%)`
                        }
                      },
                    },
                  }}
                  data={{
                    labels: ['Critical', 'High', 'Medium'],
                    datasets: [{
                      data: [stats.critical, stats.high, stats.medium],
                      backgroundColor: ['#e11d48', '#f59e0b', '#3b5bdb'],
                      borderWidth: 3,
                      borderColor: '#ffffff',
                      hoverOffset: 8,
                      hoverBorderWidth: 4,
                    }],
                  }}
                />
              </div>
            </div>

            <div className="chart-card glass-panel">
              <div className="chart-header">
                <h3>Anomaly Types</h3>
                <p className="chart-subtitle">Classification of detected anomalies</p>
              </div>
              <div className="chart-container">
                <Bar
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: { ...tooltipStyle }
                    },
                    scales: baseScales
                  }}
                  data={{
                    labels: ['SPIKE', 'DROP', 'UNUSUAL'],
                    datasets: [{
                      label: 'Count',
                      data: [stats.spike, stats.drop, stats.unusual],
                      backgroundColor: ['#e11d48', '#3b5bdb', '#f59e0b'],
                      borderRadius: 6,
                      borderSkipped: false,
                    }],
                  }}
                />
              </div>
            </div>

            <div className="chart-card glass-panel">
              <div className="chart-header">
                <h3>Deviation Distribution</h3>
                <p className="chart-subtitle">Percentage deviation ranges</p>
              </div>
              <div className="chart-container">
                <Bar
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: { ...tooltipStyle }
                    },
                    scales: baseScales
                  }}
                  data={{
                    labels: Object.keys(stats.buckets),
                    datasets: [{
                      label: 'Count',
                      data: Object.values(stats.buckets),
                      backgroundColor: '#0284c7',
                      borderRadius: 5,
                      borderSkipped: false,
                    }],
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {!error && (
        <div className="anomalies-table-panel glass-panel">
          <div className="table-header">
            <h3>Anomaly Records</h3>
            <div className="table-filters">
              <select
                value={filterSev}
                onChange={e => setFilterSev(e.target.value)}
                className="filter-select"
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
              </select>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="filter-select"
              >
                <option value="">All Types</option>
                <option value="SPIKE">SPIKE</option>
                <option value="DROP">DROP</option>
                <option value="UNUSUAL_PATTERN">UNUSUAL</option>
              </select>
            </div>
          </div>

          <div className="table-container">
            <table className="anomalies-table">
              <thead>
                <tr>
                  <th>Household ID</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Actual kWh</th>
                  <th>Expected kWh</th>
                  <th>Deviation</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((a, i) => (
                  <tr key={i} className="anomaly-row">
                    <td className="household-id">{a.household_id}</td>
                    <td className="date-cell">{a.detected_at?.slice(0, 10)}</td>
                    <td><span className="badge type-badge">{a.anomaly_type}</span></td>
                    <td>
                      <span className={`badge severity-badge ${a.severity.toLowerCase()}`}>
                        {a.severity}
                      </span>
                    </td>
                    <td className="value-cell">{a.energy_value?.toFixed(4)}</td>
                    <td className="value-cell">{a.expected_value?.toFixed(4)}</td>
                    <td className={`deviation-cell ${a.deviation_percent > 0 ? 'positive' : 'negative'}`}>
                      {a.deviation_percent > 0 ? '+' : ''}{a.deviation_percent?.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="empty-table-state">
              <AlertCircle size={48} />
              <h4>No Anomalies Found</h4>
              <p>No anomalies match the current filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}