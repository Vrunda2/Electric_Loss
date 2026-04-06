import { useState, useEffect } from 'react';
import { API } from '../services/api';
import { House, BarChart, Zap, Siren } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const C = ['#3b5bdb','#0284c7','#059669','#f59e0b','#e11d48','#0d9488','#f97316','#64748b'];

function KpiCard({ title, value, sub, icon: Icon, color, bg }) {
  return (
    <div className="glass-panel" style={{ 
      padding: '24px', 
      position: 'relative', 
      overflow: 'hidden',
      transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      border: `1px solid ${color}20`,
      boxShadow: 'none',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
    }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: `linear-gradient(90deg, ${color}, ${color}40)`, borderRadius: '14px 14px 0 0' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background:` transparent 70%)`, pointerEvents: 'none', borderRadius: '14px' }} />
      <div style={{ fontSize: '11px', fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', position: 'relative', opacity: 0.8 }}>{title}</div>
      <div style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1, marginBottom: '8px', color, letterSpacing: '-0.03em', position: 'relative' }}>
        {value === null ? <div className="skeleton" style={{ width: '90px', height: '30px' }} /> : value}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--muted)', position: 'relative', fontWeight: 500 }}>
        {sub === null ? <div className="skeleton" style={{ width: '130px', height: '14px' }} /> : sub}
      </div>
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
        // boxShadow: `0 4px 12px ${color}15`,
        fontWeight: 600
      }}>
        <Icon size={24} />
      </div>
    </div>
  );
}

const tooltipDefaults = {
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

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [cityData, setCityData] = useState([]);
  const [tariffData, setTariffData] = useState([]);
  const [selectedYear, setSelectedYear] = useState('All');
  const [loadingCity, setLoadingCity] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);

  useEffect(() => {
    API.dashboard()
      .then(setStats)
      .catch((err) => {
        console.error('Dashboard API error', err);
        setDashboardError(err.message || 'Failed to load dashboard data');
      });
    API.tariff().then(setTariffData).catch(console.error);
  }, []);

  useEffect(() => {
    setLoadingCity(true);
    let start = '', end = '';
    if (selectedYear !== 'All') {
      start = `${selectedYear}-01-01`;
      end = `${selectedYear}-12-31`;
    }
    API.citySummary(start, end)
      .then(data => {
        setCityData(data);
        setLoadingCity(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingCity(false);
      });
  }, [selectedYear]);

  const last90 = cityData.slice(-90);

  const baseOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 6, color: '#7b82b0', font: { size: 12 } } },
      tooltip: { 
        ...tooltipDefaults,
        callbacks: {
          title: (items) => {
            const d = cityData[items[0].dataIndex];
            return d ? `Date: ${d.reading_date}` : '';
          }
        }
      },
    },
    scales: {
      x: { 
        grid: { display: false }, 
        ticks: { 
          color: '#545980', 
          font: { size: 10 },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 12 // Ensure roughly one label per month or similar
        }, 
        border: { display: false },
        title: {
          display: true,
          text: 'Time Range (Month/Year)',
          color: '#7b82b0',
          font: { size: 11, weight: '600' }
        }
      },
      y: { 
        grid: { color: 'rgba(255,255,255,0.05)' }, 
        ticks: { color: '#545980', font: { size: 11 } }, 
        border: { display: false },
        title: {
          display: true,
          text: 'Avg Energy (kWh)',
          color: '#7b82b0',
          font: { size: 11, weight: '600' }
        }
      },
    },
  };

  return (
    <div className="page-container">
      <h1 className="page-title">Dashboard Overview</h1>

      {dashboardError && (
        <div style={{ marginBottom: '20px', padding: '14px 18px', border: '1px solid #f59e0b', background: '#fff7ed', color: '#92400e', borderRadius: '10px' }}>
          <strong>Dashboard error:</strong> {dashboardError}.<br />
          Check backend is running (http://localhost:8000/analytics/dashboard) and data exists.
        </div>
      )}

      <div className="grid-4" style={{ marginBottom: '28px' }}>
        <KpiCard title="Total Households" value={stats?.total_households?.toLocaleString() ?? null} sub="London smart meters" icon={House}   color="#0284c7" bg="rgba(2,132,199,0.12)" />
        <KpiCard title="Total Readings"   value={stats ? (stats.total_readings / 1e6).toFixed(2) + 'M' : null} sub="daily energy records" icon={BarChart} color="#06b6d4" bg="rgba(6,182,212,0.12)" />
        <KpiCard title="Avg Consumption"  value={stats ? stats.avg_daily_consumption?.toFixed(2) + ' kWh' : null} sub="per household / day" icon={Zap}      color="#f59e0b" bg="rgba(245,158,11,0.12)" />
        <KpiCard title="Anomalies"        value={stats?.total_anomalies?.toLocaleString() ?? null} sub="by Isolation Forest" icon={Siren}    color="#f43f5e" bg="rgba(244,63,94,0.12)" />
      </div>

      <div className="grid-2-1" style={{ marginBottom: '28px' }}>
        <div className="glass-panel" style={{ 
          padding: '24px',
          transition: 'transform 0.3s ease',
          border: '1px solid rgba(2,132,199,0.2)',
          boxShadow: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>City-Wide Daily Consumption</h3>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="glass-panel"
              style={{ 
                fontSize: '12px', 
                padding: '6px 12px', 
                border: '1px solid rgba(2,132,199,0.3)', 
                background: 'rgba(240,242,247,0.5)',
                color: 'var(--text)', 
                cursor: 'pointer', 
                outline: 'none',
                borderRadius: '8px',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
            >
              <option value="All">All Years</option>
              <option value="2011">2011</option>
              <option value="2012">2012</option>
              <option value="2013">2013</option>
              <option value="2014">2014</option>
            </select>
          </div>
          <div style={{ height: '280px', position: 'relative' }}>
            {loadingCity && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(1px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                <div className="loading-spinner"></div>
              </div>
            )}
            {cityData && cityData.length > 0 ? (
              <Line
                options={baseOpts}
                data={{
                  labels: cityData.map(d => {
                    if (!d.reading_date) return '';
                    const date = new Date(d.reading_date);
                    const month = date.toLocaleString('en-US', { month: 'short' });
                    return selectedYear === 'All' ? `${month} ${date.getFullYear().toString().slice(2)}` : `${month} ${date.getDate()}`;
                  }),
                  datasets: [{
                    label: selectedYear === 'All' ? 'Avg City-Wide Consumption (kWh)' : `Consumption in ${selectedYear} (kWh)`,
                    data: cityData.map(d => d.avg_consumption),
                    borderColor: '#0284c7',
                    backgroundColor: 'rgba(2,132,199,0.08)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#0284c7',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    borderWidth: 2.5,
                  }],
                }}
              />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                {cityData ? 'No daily trends available' : <div className="skeleton" style={{ width: '100%', height: '100%' }} />}
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ 
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transition: 'transform 0.3s ease',
          border: '1px solid rgba(2,132,199,0.2)',
          boxShadow: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '20px', color: 'var(--text)', letterSpacing: '-0.02em', alignSelf: 'flex-start' }}>Tariff Distribution</h3>
          <div style={{ height: '220px', width: '100%', display: 'flex', justifyContent: 'center' }}>
            {tariffData.length > 0 ? (
              <Doughnut
                options={{
                  maintainAspectRatio: false,
                  cutout: '72%',
                  plugins: {
                    legend: { position: 'bottom', labels: { color: '#7b82b0', usePointStyle: true, boxWidth: 8, font: { size: 12, weight: 600 }, padding: 16 } },
                    tooltip: { ...tooltipDefaults },
                  },
                }}
                data={{
                  labels: tariffData.map(t => t.tariff_type),
                  datasets: [{
                    data: tariffData.map(t => t.household_count),
                    backgroundColor: ['#0284c7', '#ea580c'],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 8,
                  }],
                }}
              />
            ) : <div className="skeleton" style={{ width: '180px', height: '180px', borderRadius: '50%' }} />}
          </div>
        </div>
      </div>
    </div>
  );
}