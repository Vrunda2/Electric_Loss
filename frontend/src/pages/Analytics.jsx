import { useState, useEffect, useMemo } from 'react';
import { API } from '../services/api';
import { BarChart, Zap, Trophy, TrendingDown, Layers } from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';

const C = ['#3b5bdb', '#0284c7', '#059669', '#d97706', '#7c3aed', '#e11d48', '#0d9488', '#64748b'];

const tooltipStyle = {
  backgroundColor: '#ffffff',
  titleColor: '#0f172a',
  bodyColor: '#334155',
  borderColor: '#d1d5db',
  borderWidth: 1,
  padding: 10,
  cornerRadius: 6,
  caretSize: 6,
  displayColors: true,
};

function KpiCard({ title, value, sub, icon: Icon, color, bg }) {
  return (
    <div className="glass-panel" style={{ 
      padding: '16px', 
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
      <div style={{ fontSize: '10px', fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', position: 'relative', opacity: 0.8 }}>{title}</div>
      <div style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1, marginBottom: '6px', color, letterSpacing: '-0.03em', position: 'relative' }}>
        {value === null ? <div className="skeleton" style={{ width: '60px', height: '20px' }} /> : value}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500, position: 'relative' }}>{sub}</div>
      <div style={{ 
        position: 'absolute', 
        top: '16px', 
        right: '16px', 
        width: '36px', 
        height: '36px', 
        borderRadius: '9px', 
        background: `linear-gradient(135deg, ${bg}, ${bg}80)`,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color,
        fontWeight: 600
      }}>
        <Icon size={18} />
      </div>
    </div>
  );
}

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('acorn');
  const [loadingAcorn, setLoadingAcorn] = useState(true);
  const [loadingEff, setLoadingEff] = useState(false);
  const [effLoaded, setEffLoaded] = useState(false);
  const [acornData, setAcornData] = useState([]);
  const [tariffData, setTariffData] = useState([]);
  const [effData, setEffData] = useState([]);

  useEffect(() => {
    Promise.all([API.acorn(), API.tariff()])
      .then(([ac, tr]) => { setAcornData(ac); setTariffData(tr); setLoadingAcorn(false); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (activeTab === 'efficiency' && !effLoaded && !loadingEff) {
      setLoadingEff(true);
      API.efficiencyScores(500).then(data => {
        setEffData(data); setEffLoaded(true); setLoadingEff(false);
      }).catch(console.error);
    }
  }, [activeTab, effLoaded, loadingEff]);

  const effStats = useMemo(() => {
    if (!effData.length) return null;
    const byGroup = {};
    const buckets = { '0–20': 0, '21–40': 0, '41–60': 0, '61–80': 0, '81–100': 0 };
    effData.forEach(s => {
      if (!byGroup[s.acorn_group]) byGroup[s.acorn_group] = [];
      byGroup[s.acorn_group].push(s);
      const v = s.efficiency_score || 0;
      if (v <= 20) buckets['0–20']++;
      else if (v <= 40) buckets['21–40']++;
      else if (v <= 60) buckets['41–60']++;
      else if (v <= 80) buckets['61–80']++;
      else buckets['81–100']++;
    });
    const groupNames = Object.keys(byGroup);
    const groupScores = groupNames.map(g => {
      const arr = byGroup[g];
      return Math.round((arr.reduce((a, b) => a + b.efficiency_score, 0) / arr.length) * 100) / 100;
    });
    const sorted = [...effData].sort((a, b) => b.efficiency_score - a.efficiency_score);
    const top10 = sorted.slice(0, 10);
    const bottom10 = [...effData].sort((a, b) => a.efficiency_score - b.efficiency_score).slice(0, 10);
    const avgScore = effData.reduce((a, b) => a + b.efficiency_score, 0) / effData.length;
    return { groupNames, groupScores, buckets, top10, bottom10, avgScore };
  }, [effData]);

  const baseOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { ...tooltipStyle } },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11 } },
        border: { display: false },
        title: {
          display: true,
          text: 'ACORN Groups',
          color: '#374151',
          font: { size: 12, weight: '600' }
        }
      },
      y: {
        grid: { color: 'rgba(226, 232, 240, 0.6)' },
        ticks: { color: '#64748b', font: { size: 11 } },
        border: { display: false },
        title: {
          display: true,
          text: 'Value',
          color: '#374151',
          font: { size: 12, weight: '600' }
        }
      },
    },
  };

  const hBarOpts = {
    ...baseOpts,
    indexAxis: 'y',
    scales: {
      y: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11 } },
        border: { display: false },
        title: {
          display: true,
          text: 'ACORN Groups',
          color: '#374151',
          font: { size: 12, weight: '600' }
        }
      },
      x: {
        grid: { color: 'rgba(226, 232, 240, 0.6)' },
        ticks: { color: '#64748b', font: { size: 11 } },
        border: { display: false },
        title: {
          display: true,
          text: 'Avg Daily Consumption (kWh)',
          color: '#374151',
          font: { size: 12, weight: '600' }
        }
      },
    },
  };

  const tabBtn = (id, label, Icon) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`filter-btn ${activeTab === id ? 'active' : ''}`}
    >
      <Icon size={15} /> {label}
    </button>
  );

  return (
    <div className="page-container">
      <h1 className="page-title">Advanced Analytics</h1>

      <div className="page-filters">
        {tabBtn('acorn', 'ACORN & Tariff', BarChart)}
        {tabBtn('efficiency', 'Efficiency Scores', Zap)}
      </div>

      {activeTab === 'acorn' ? (
        loadingAcorn
          ? <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>Loading analytics…</div>
          : (
            <div className="animate-fade-in">
              <div className="charts-grid">
                {/* Avg Consumption bar */}
                <div className="chart-card glass-panel" style={{ border: '1px solid rgba(2,132,199,0.1)', transition: 'transform 0.3s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div className="chart-header">
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>Avg Consumption by ACORN Group</h3>
                  </div>
                  <div className="chart-container">
                    <Bar
                      options={hBarOpts}
                      data={{
                        labels: acornData.map(a => a.acorn_group),
                        datasets: [{
                          data: acornData.map(a => a.avg_daily_consumption),
                          backgroundColor: acornData.map((_, i) => C[i % C.length]),
                          borderColor: acornData.map((_, i) => C[i % C.length]),
                          borderWidth: 0,
                          borderRadius: 6,
                          maxBarThickness: 28,
                        }],
                      }}
                    />
                  </div>
                </div>

                {/* Tariff doughnut */}
                <div className="chart-card">
                  <div className="chart-header">
                    <h3>Tariff Type Distribution</h3>
                  </div>
                  <div className="chart-container" style={{ display: 'flex', justifyContent: 'center' }}>
                    <Doughnut
                      options={{
                        maintainAspectRatio: false,
                        cutout: '65%',
                        plugins: {
                          legend: { position: 'right', labels: { color: '#64748b', usePointStyle: true, boxWidth: 8, font: { size: 12 }, padding: 10 } },
                          tooltip: { ...tooltipStyle },
                        },
                      }}
                      data={{
                        labels: tariffData.map(t => `${t.tariff_type} (${t.household_count})`),
                        datasets: [{
                          data: tariffData.map(t => t.household_count),
                          backgroundColor: ['#3b5bdb', '#d97706'],
                          borderColor: ['#3b5bdb', '#d97706'],
                          borderWidth: 2,
                          hoverOffset: 4
                        }],
                      }}
                    />
                  </div>
                  <div className="analytics-table-container">
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>Tariff</th>
                          <th>Households</th>
                          <th>Avg Daily kWh</th>
                          <th>Total kWh</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tariffData.map((t, i) => (
                          <tr key={i}>
                            <td>
                              <span className={`tariff-badge ${t.tariff_type === 'ToU' ? 'tou' : 'standard'}`}>
                                {t.tariff_type}
                              </span>
                            </td>
                            <td className="household-count">{t.household_count?.toLocaleString()}</td>
                            <td className="energy-value">{t.avg_daily_kwh?.toFixed(4)}</td>
                            <td className="total-value">{t.total_kwh?.toFixed(0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="charts-grid">
                {/* Households per block */}
                <div className="chart-card">
                  <div className="chart-header">
                    <h3>Households per ACORN Group</h3>
                  </div>
                  <div className="chart-container">
                    <Bar
                      options={{
                        ...baseOpts,
                        scales: {
                          ...baseOpts.scales,
                          y: {
                            ...baseOpts.scales.y,
                            title: {
                              display: true,
                              text: 'Number of Households',
                              color: '#374151',
                              font: { size: 12, weight: '600' }
                            }
                          }
                        }
                      }}
                      data={{
                        labels: acornData.map(a => a.acorn_group),
                        datasets: [{
                          data: acornData.map(a => a.household_count),
                          backgroundColor: acornData.map((_, i) => C[i % C.length]),
                          borderColor: acornData.map((_, i) => C[i % C.length]),
                          borderWidth: 0,
                          borderRadius: 6,
                          maxBarThickness: 28,
                        }],
                      }}
                    />
                  </div>
                </div>

                {/* Detail table */}
                <div className="chart-card">
                  <div className="chart-header">
                    <h3>ACORN Group Details</h3>
                  </div>
                  <div className="analytics-table-container">
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>Group</th>
                          <th>HH Count</th>
                          <th>Avg kWh</th>
                          <th>Max</th>
                          <th>Min</th>
                        </tr>
                      </thead>
                      <tbody>
                        {acornData.map((a, i) => (
                          <tr key={i} className="analytics-row">
                            <td>
                              <span className="acorn-badge" style={{ background: `${C[i % C.length]}18`, color: C[i % C.length] }}>
                                {a.acorn_group}
                              </span>
                            </td>
                            <td className="household-count">{a.household_count}</td>
                            <td className="avg-value">{a.avg_daily_consumption?.toFixed(4)}</td>
                            <td className="max-value">{a.max_consumption?.toFixed(4)}</td>
                            <td className="min-value">{a.min_consumption?.toFixed(4)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )
      ) : (
        loadingEff
          ? <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>Loading efficiency scores…</div>
          : effStats
            ? (
              <div className="animate-fade-in">
              <div className="kpi-grid">
                <KpiCard title="Avg Efficiency"  value={effStats.avgScore.toFixed(2)} sub={`across ${effData.length} households`} icon={Zap}         color="#059669" bg="#ecfdf5" />
                <KpiCard title="Most Efficient"  value={effStats.top10[0]?.household_id} sub={`Score ${effStats.top10[0]?.efficiency_score?.toFixed(0)}/100`} icon={Trophy}      color="#0284c7" bg="#e0f2fe" />
                <KpiCard title="Least Efficient" value={effStats.bottom10[0]?.household_id} sub={`Score ${effStats.bottom10[0]?.efficiency_score?.toFixed(0)}/100`} icon={TrendingDown} color="#e11d48" bg="#fff1f2" />
                <KpiCard title="ACORN Groups"    value={effStats.groupNames.length} sub="with efficiency data" icon={Layers}       color="#d97706" bg="#fffbeb" />
              </div>

              <div className="charts-grid">
                <div className="chart-card">
                  <div className="chart-header">
                    <h3>Avg Efficiency by ACORN Group</h3>
                  </div>
                  <div className="chart-container">
                    <Bar
                      options={{
                        ...baseOpts,
                        scales: {
                          ...baseOpts.scales,
                          y: {
                            ...baseOpts.scales.y,
                            min: 0,
                            max: 100,
                            title: {
                              display: true,
                              text: 'Efficiency Score',
                              color: '#374151',
                              font: { size: 12, weight: '600' }
                            }
                          }
                        }
                      }}
                      data={{
                        labels: effStats.groupNames,
                        datasets: [{
                          data: effStats.groupScores,
                          backgroundColor: effStats.groupNames.map((_, i) => C[i % C.length]),
                          borderColor: effStats.groupNames.map((_, i) => C[i % C.length]),
                          borderWidth: 0,
                          borderRadius: 6,
                          maxBarThickness: 32,
                        }],
                      }}
                    />
                  </div>
                </div>
                <div className="chart-card">
                  <div className="chart-header">
                    <h3>Score Distribution</h3>
                  </div>
                  <div className="chart-container">
                    <Bar
                      options={{
                        ...baseOpts,
                        scales: {
                          ...baseOpts.scales,
                          x: {
                            ...baseOpts.scales.x,
                            title: {
                              display: true,
                              text: 'Score Ranges',
                              color: '#374151',
                              font: { size: 12, weight: '600' }
                            }
                          },
                          y: {
                            ...baseOpts.scales.y,
                            title: {
                              display: true,
                              text: 'Number of Households',
                              color: '#374151',
                              font: { size: 12, weight: '600' }
                            }
                          }
                        }
                      }}
                      data={{
                        labels: Object.keys(effStats.buckets),
                        datasets: [{
                          data: Object.values(effStats.buckets),
                          backgroundColor: ['#e11d48', '#f97316', '#d97706', '#059669', '#3b5bdb'],
                          borderColor: ['#e11d48', '#f97316', '#d97706', '#059669', '#3b5bdb'],
                          borderWidth: 0,
                          borderRadius: 6,
                          maxBarThickness: 34,
                        }],
                      }}
                    />
                  </div>
                </div>
              </div>

                <div className="charts-grid">
                  {/* Top 10 */}
                  <div className="chart-card">
                    <div className="chart-header">
                      <div className="efficiency-indicator">
                        <div className="indicator-dot" style={{ background: '#059669' }} />
                        Top 10 Most Efficient
                      </div>
                    </div>
                    <div className="analytics-table-container">
                      <table className="analytics-table">
                        <thead>
                          <tr>
                            <th>Household</th>
                            <th>ACORN</th>
                            <th>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {effStats.top10.map((s, i) => (
                            <tr key={i} className="analytics-row">
                              <td className="household-id">{s.household_id}</td>
                              <td>{s.acorn_group}</td>
                              <td>
                                <div className="score-bar">
                                  <div className="score-fill" style={{ width: `${s.efficiency_score}%`, background: '#059669' }} />
                                  <span className="score-value">{s.efficiency_score?.toFixed(0)}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Bottom 10 */}
                  <div className="chart-card">
                    <div className="chart-header">
                      <div className="efficiency-indicator">
                        <div className="indicator-dot" style={{ background: '#e11d48' }} />
                        Bottom 10 (Most Opportunity)
                      </div>
                    </div>
                    <div className="analytics-table-container">
                      <table className="analytics-table">
                        <thead>
                          <tr>
                            <th>Household</th>
                            <th>ACORN</th>
                            <th>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {effStats.bottom10.map((s, i) => (
                            <tr key={i} className="analytics-row">
                              <td className="household-id">{s.household_id}</td>
                              <td>{s.acorn_group}</td>
                              <td>
                                <div className="score-bar">
                                  <div className="score-fill" style={{ width: `${s.efficiency_score}%`, background: '#e11d48' }} />
                                  <span className="score-value">{s.efficiency_score?.toFixed(0)}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ) : null
      )}
    </div>
  );
}