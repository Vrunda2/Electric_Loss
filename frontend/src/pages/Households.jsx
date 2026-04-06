import { useState, useEffect, useMemo } from 'react';
import { API } from '../services/api';
import { House, Table, Search, FileText, Clock, Filter, BarChart3, PieChart } from 'lucide-react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const C = ['#3b5bdb','#0284c7','#059669','#f59e0b','#e11d48','#0d9488','#f97316','#64748b'];

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

const baseScales = {
  x: {
    grid: { display: false },
    ticks: { color: '#64748b', font: { size: 11 } },
    border: { display: false },
    title: {
      display: true,
      text: 'Block Number',
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
      text: 'Number of Households',
      color: '#64748b',
      font: { size: 12, weight: 500 }
    }
  },
};

const energyScales = {
  x: {
    grid: { display: false },
    ticks: { color: '#64748b', font: { size: 11 } },
    border: { display: false },
    title: {
      display: true,
      text: 'Date (MM-DD)',
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
};

function KpiCard({ title, value, sub, icon: Icon, color, bg }) {
  return (
    <div className="kpi-card glass-panel">
      <div className="kpi-accent" style={{ background: color }} />
      <div className="kpi-gradient" style={{ background: ` transparent 70%)` }} />
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

function FilterButton({ children, active, onClick, icon: Icon }) {
  return (
    <button className={`filter-btn ${active ? 'active' : ''}`} onClick={onClick}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export default function Households() {
  const [activeTab, setActiveTab]         = useState('block-view');
  const [households, setHouseholds]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [searchQuery, setSearchQuery]     = useState('');
  const [filterTariff, setFilterTariff]   = useState('');
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [energyData, setEnergyData]       = useState([]);
  const [energyLoading, setEnergyLoading] = useState(false);

  useEffect(() => {
    API.households(600).then(data => { setHouseholds(data); setLoading(false); }).catch(console.error);
  }, []);

  const blockStats = useMemo(() => {
    if (!households.length) return null;
    const blocks = {}, acorns = {};
    let std = 0, tou = 0;
    households.forEach(h => {
      const b = h.block_id || 'Unknown';
      if (!blocks[b]) blocks[b] = { total: 0, std: 0, tou: 0 };
      blocks[b].total++;
      if (h.tariff_type === 'Std') { blocks[b].std++; std++; } else { blocks[b].tou++; tou++; }
      const ag = h.acorn_group || 'Unknown';
      acorns[ag] = (acorns[ag] || 0) + 1;
    });
    const sortedBlocks = Object.keys(blocks).sort((a, b) => parseInt(a.replace('block_', '')) - parseInt(b.replace('block_', '')));
    return { blocks, sortedBlocks, acorns, std, tou, totalBlocks: sortedBlocks.length };
  }, [households]);

  const filteredHH = useMemo(() =>
    households.filter(h => {
      const matchQ = !searchQuery || h.household_id?.toLowerCase().includes(searchQuery.toLowerCase()) || h.acorn_group?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchT = !filterTariff || h.tariff_type === filterTariff;
      return matchQ && matchT;
    }), [households, searchQuery, filterTariff]);

  const selectHousehold = async h => {
    setSelectedHousehold(h);
    setEnergyLoading(true);
    try { const energy = await API.householdEnergy(h.household_id); setEnergyData(energy); }
    catch { setEnergyData([]); }
    setEnergyLoading(false);
  };

  const tabBtn = (id, label, Icon) => (
    <FilterButton
      key={id}
      active={activeTab === id}
      onClick={() => setActiveTab(id)}
      icon={Icon}
    >
      {label}
    </FilterButton>
  );

  if (loading || !blockStats)
    return <div className="page-container"><h1 className="page-title">Household Analysis</h1><div style={{ padding: '20px', color: 'var(--muted)' }}>Loading…</div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Household Analysis</h1>
        <div className="page-filters">
          {tabBtn('block-view', 'Block View', Table)}
          {tabBtn('search-view', 'Search View', Search)}
        </div>
      </div>

      {activeTab === 'block-view' ? (
        <div className="dashboard-content animate-fade-in">
          <div className="kpi-grid">
            <KpiCard title="Total Blocks"    value={blockStats.totalBlocks} sub="data blocks" icon={Table}    color="#3b5bdb" bg="rgba(59,91,219,0.12)" />
            <KpiCard title="Households"      value={households.length.toLocaleString()} sub={`avg ${Math.round(households.length / blockStats.totalBlocks)} per block`} icon={House} color="#059669" bg="rgba(5,150,105,0.12)" />
            <KpiCard title="Standard Tariff" value={blockStats.std.toLocaleString()} sub={`${((blockStats.std / households.length) * 100).toFixed(1)}% of total`} icon={FileText} color="#0284c7" bg="rgba(2,132,199,0.12)" />
            <KpiCard title="Time-of-Use"     value={blockStats.tou.toLocaleString()} sub={`${((blockStats.tou / households.length) * 100).toFixed(1)}% of total`} icon={Clock} color="#f59e0b" bg="rgba(245,158,11,0.12)" />
          </div>

          <div className="charts-grid">
            <div className="chart-card glass-panel">
              <div className="chart-header">
                <div>
                  <h3>Household Distribution by Block</h3>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0 0' }}>
                    Showing tariff breakdown for the first 20 data blocks
                  </p>
                </div>
                <BarChart3 size={20} />
              </div>
              <div className="chart-container">
                <Bar
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                        position: 'top',
                        labels: {
                          color: '#64748b',
                          usePointStyle: true,
                          boxWidth: 12,
                          font: { size: 12 },
                          padding: 16
                        }
                      },
                      tooltip: { ...tooltipStyle }
                    },
                    scales: baseScales
                  }}
                  data={{
                    labels: blockStats.sortedBlocks.slice(0, 20).map(b => b.replace('block_', 'Blk ')),
                    datasets: [
                      {
                        label: 'Standard Tariff',
                        data: blockStats.sortedBlocks.slice(0, 20).map(b => blockStats.blocks[b].std),
                        backgroundColor: C[0],
                        borderRadius: 4,
                        borderSkipped: false,
                      },
                      {
                        label: 'Time-of-Use Tariff',
                        data: blockStats.sortedBlocks.slice(0, 20).map(b => blockStats.blocks[b].tou),
                        backgroundColor: C[3],
                        borderRadius: 4,
                        borderSkipped: false,
                      },
                    ],
                  }}
                />
              </div>
            </div>

            <div className="chart-card glass-panel">
              <div className="chart-header">
                <div>
                  <h3>ACORN Group Distribution</h3>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0 0' }}>
                    Socio-demographic classification of households
                  </p>
                </div>
                <PieChart size={20} />
              </div>
              <div className="chart-container">
                <Pie
                  options={{
                    maintainAspectRatio: false,
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
                              text: `${label}: ${data.datasets[0].data[i]} households`,
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
                          label: (context) => {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                          }
                        }
                      },
                    },
                  }}
                  data={{
                    labels: Object.keys(blockStats.acorns),
                    datasets: [{
                      data: Object.values(blockStats.acorns),
                      backgroundColor: ['#2f4ac0', '#fb923c', '#059669', '#d97706'],
                      borderWidth: 3,
                      borderColor: '#ffffff',
                      hoverOffset: 12,
                      hoverBorderWidth: 4,
                    }],
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="search-content">
          <div className="search-panel glass-panel">
            <div className="search-header">
              <h3>Search & Filter</h3>
              <Filter size={20} />
            </div>
            <div className="search-controls">
              <input
                className="search-input"
                type="text"
                placeholder="Household ID e.g. MAC000002"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <select className="search-select" value={filterTariff} onChange={e => setFilterTariff(e.target.value)}>
                <option value="">All Tariffs</option>
                <option value="Std">Standard</option>
                <option value="ToU">Time of Use</option>
              </select>
              <div className="search-count">{filteredHH.length} households found</div>
            </div>

            <div className="search-results">
              {filteredHH.slice(0, 100).map(h => (
                <div
                  key={h.household_id}
                  onClick={() => selectHousehold(h)}
                  className={`search-item ${selectedHousehold?.household_id === h.household_id ? 'selected' : ''}`}
                >
                  <div className="search-item-key">{h.household_id}</div>
                  <div className="search-item-meta">
                    <span>{h.acorn_group || '--'}</span>
                    <span>·</span>
                    <span>{h.tariff_type || '--'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="detail-panel glass-panel">
            {!selectedHousehold ? (
              <div className="empty-state">
                <House size={56} />
                <h4>Select a Household</h4>
                <p>Use the search panel to find and select a household to view their energy consumption data and patterns.</p>
              </div>
            ) : energyLoading ? (
              <div className="loading-state">
                <p>Loading energy data...</p>
              </div>
            ) : energyData.length === 0 ? (
              <div className="empty-state">
                <BarChart3 size={56} />
                <h4>No Data Available</h4>
                <p>No energy consumption data found for {selectedHousehold.household_id}.</p>
              </div>
            ) : (
              <div className="energy-chart">
                <div className="chart-header">
                  <div>
                    <h3>Daily Energy Consumption Pattern</h3>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0 0' }}>
                      Last 30 days of consumption data for {selectedHousehold.household_id}
                    </p>
                  </div>
                  <BarChart3 size={20} />
                </div>
                <div className="chart-container">
                  <Line
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          ...tooltipStyle,
                          callbacks: {
                            title: (context) => `Date: ${context[0].label}`,
                            label: (context) => `Energy: ${context.parsed.y} kWh`
                          }
                        }
                      },
                      scales: energyScales,
                      interaction: {
                        intersect: false,
                        mode: 'index'
                      }
                    }}
                    data={{
                      labels: energyData.map(d => d.reading_date?.slice(5)),
                      datasets: [{
                        label: 'Daily Energy Consumption',
                        data: energyData.map(d => d.energy_sum),
                        borderColor: C[0],
                        backgroundColor: 'rgba(59,91,219,0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 6,
                        pointBackgroundColor: C[0],
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        borderWidth: 3,
                      }],
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}