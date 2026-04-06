export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Helper to manage token in localStorage
const tokenKey = 'smartgrid_auth_token';

const api = {
  getToken: () => localStorage.getItem(tokenKey),
  setToken: (token) => {
    if (token) localStorage.setItem(tokenKey, token);
    else localStorage.removeItem(tokenKey);
  },
  
  getHeaders: () => {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem(tokenKey);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  get: async (url) => {
    const r = await fetch(BASE_URL + url, {
      headers: api.getHeaders()
    });
    if (r.status === 401) {
      api.setToken(null);
      window.dispatchEvent(new Event('auth-expired'));
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
    return r.json();
  },

  post: async (url, body = null) => {
    const opts = { 
      method: 'POST',
      headers: api.getHeaders()
    };
    if (body) { 
        opts.body = JSON.stringify(body); 
    }
    const r = await fetch(BASE_URL + url, opts);
    if (r.status === 401) {
      api.setToken(null);
      window.dispatchEvent(new Event('auth-expired'));
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
    return r.json();
  }
};

export const API = {
  // Auth
  login:           (username, password) => api.post('/auth/login', { username, password }),
  me:              ()          => api.get('/auth/me'),
  logout:          ()          => api.setToken(null),
  setToken:        (t)         => api.setToken(t),
  isAuthenticated: ()          => !!api.getToken(),

  // Data
  dashboard:       ()          => api.get('/analytics/dashboard'),
  households:      (n=500)     => api.get(`/households/?limit=${n}`),
  household:       (id)        => api.get(`/households/${id}`),
  householdEnergy: (id, s, e)  => api.get(`/energy/household/${id}${_dateParams(s,e)}`),
  citySummary:     (s, e)      => api.get(`/energy/city/summary${_dateParams(s, e)}`),
  anomalies:       (sev='', limit=500) => api.get(`/anomalies/?limit=${limit}${sev?'&severity='+sev:''}`),
  trainModel:      ()          => api.post('/anomalies/train'),
  detectSync:      (id='')     => api.post(`/anomalies/detect/sync${id?'?household_id='+id:''}`),
  weatherDaily:    ()          => api.get('/weather/daily'),
  weatherCorr:     ()          => api.get('/analytics/weather-correlation'),
  acorn:           ()          => api.get('/analytics/acorn'),
  tariff:          ()          => api.get('/energy/tariff/comparison'),
  forecast:        (id, days=30) => api.get(`/forecast/${id}?days=${days}`),
  householdCost:   (id, start='', end='') => api.get(`/energy/household/${id}/cost${_dateParams(start, end)}`),
  householdBenchmark: (id) => api.get(`/energy/household/${id}/benchmark`),
  efficiencyScores: (limit=500) => api.get(`/energy/efficiency?limit=${limit}`),
  chat:            (message, history) => api.post('/chatbot/', { message, history }),
};

function _dateParams(start, end) {
  const p = [];
  if (start) p.push(`start_date=${start}`);
  if (end)   p.push(`end_date=${end}`);
  return p.length ? '?' + p.join('&') : '';
}
