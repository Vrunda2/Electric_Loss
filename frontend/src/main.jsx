import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

// GLOBAL Power BI style chart defaults
ChartJS.defaults.font.family = 'Plus Jakarta Sans, system-ui, sans-serif';
ChartJS.defaults.font.size = 12;
ChartJS.defaults.color = '#1f2937';
ChartJS.defaults.plugins.legend.labels.color = '#4b5563';
ChartJS.defaults.plugins.legend.labels.boxWidth = 10;
ChartJS.defaults.backgroundColor = '#fff';
ChartJS.defaults.borderColor = '#e5e7eb';

ChartJS.defaults.plugins.tooltip.enabled = true;
ChartJS.defaults.plugins.tooltip.backgroundColor = '#ffffff';
ChartJS.defaults.plugins.tooltip.titleColor = '#111827';
ChartJS.defaults.plugins.tooltip.bodyColor = '#1f2937';
ChartJS.defaults.plugins.tooltip.borderColor = '#d1d5db';
ChartJS.defaults.plugins.tooltip.borderWidth = 1;
ChartJS.defaults.plugins.tooltip.padding = 10;
ChartJS.defaults.plugins.tooltip.caretSize = 6;
ChartJS.defaults.plugins.tooltip.caretPadding = 4;
ChartJS.defaults.plugins.tooltip.cornerRadius = 6;
ChartJS.defaults.plugins.tooltip.displayColors = true;
ChartJS.defaults.plugins.tooltip.mode = 'index';
ChartJS.defaults.plugins.tooltip.intersect = false;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
