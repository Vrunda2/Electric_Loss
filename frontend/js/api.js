const BASE = 'http://localhost:8000';

const api = {
  get: async (url) => {
    const r = await fetch(BASE + url);
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
    return r.json();
  },
  post: async (url, body = null) => {
    const opts = { method: 'POST' };
    if (body) { opts.headers = {'Content-Type':'application/json'}; opts.body = JSON.stringify(body); }
    const r = await fetch(BASE + url, opts);
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
    return r.json();
  }
};

const API = {
  // ── Existing ──────────────────────────────────────────
  dashboard:       ()          => api.get('/analytics/dashboard'),
  households:      (n=500)     => api.get(`/households/?limit=${n}`),
  household:       (id)        => api.get(`/households/${id}`),
  householdEnergy: (id, s, e)  => api.get(`/energy/household/${id}${_dateParams(s,e)}`),
  citySummary:     ()          => api.get('/energy/city/summary'),
  anomalies:       (sev='', limit=500) => api.get(`/anomalies/?limit=${limit}${sev?'&severity='+sev:''}`),
  trainModel:      ()          => api.post('/anomalies/train'),
  detectSync:      (id='')     => api.post(`/anomalies/detect/sync${id?'?household_id='+id:''}`),
  weatherDaily:    ()          => api.get('/weather/daily'),
  weatherCorr:     ()          => api.get('/analytics/weather-correlation'),
  acorn:           ()          => api.get('/analytics/acorn'),
  tariff:          ()          => api.get('/energy/tariff/comparison'),
  forecast:        (id, days=30) => api.get(`/forecast/${id}?days=${days}`),

  // ── New endpoints ─────────────────────────────────────
  /**
   * Cost estimate for a household
   * Returns { household_id, tariff_type, total_cost_gbp, avg_daily_cost_gbp,
   *           total_kwh, rate_per_kwh, daily: [{reading_date, daily_cost_gbp, cumulative_cost_gbp, ...}] }
   */
  householdCost: (id, start='', end='') =>
    api.get(`/energy/household/${id}/cost${_dateParams(start, end)}`),

  /**
   * ACORN peer benchmark for a household
   * Returns { percentile_rank, pct_vs_group_avg, comparison_label,
   *           own_avg_kwh, group_avg_kwh, group_median_kwh, peer_count, ... }
   */
  householdBenchmark: (id) =>
    api.get(`/energy/household/${id}/benchmark`),

  /**
   * Efficiency scores for all households (0-100)
   * Returns [{ household_id, acorn_group, avg_kwh, efficiency_score }, ...]
   */
  efficiencyScores: (limit=500) =>
    api.get(`/energy/efficiency?limit=${limit}`),
};

// ── Helper: build date query string ─────────────────────
function _dateParams(start, end) {
  const p = [];
  if (start) p.push(`start_date=${start}`);
  if (end)   p.push(`end_date=${end}`);
  return p.length ? '?' + p.join('&') : '';
}


// ─────────────────────────────────────────────────────────
// Chart helpers — shared across all pages
// ─────────────────────────────────────────────────────────
const PBI_COLORS = [
  '#0078D4', '#00B4D8', '#F2994A', '#27AE60',
  '#9B51E0', '#EB5757', '#F2C94C', '#219653',
  '#2D9CDB', '#BB6BD9'
];

function pbiTooltip(extraCallbacks = {}) {
  return {
    backgroundColor: '#ffffff',
    titleColor:  '#1e293b',
    bodyColor:   '#475569',
    borderColor: '#e2e8f0',
    borderWidth:  1,
    padding:     12,
    titleFont:   { weight: '600', size: 13 },
    bodyFont:    { size: 12 },
    callbacks:   extraCallbacks,
  };
}

function pbiScales(xLabel = '', yLabel = '') {
  return {
    x: {
      grid:  { color: '#f1f5f9', drawBorder: false },
      ticks: { color: '#94a3b8', font: { size: 11 } },
      ...(xLabel ? { title: { display: true, text: xLabel, color: '#64748b', font: { size: 11 } } } : {})
    },
    y: {
      grid:  { color: '#f1f5f9', drawBorder: false },
      ticks: { color: '#94a3b8', font: { size: 11 } },
      ...(yLabel ? { title: { display: true, text: yLabel, color: '#64748b', font: { size: 11 } } } : {})
    }
  };
}