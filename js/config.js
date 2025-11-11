// Configuration constants and DOM element references

// --- Config Constants ---
const DATA_URL = 'data/tle_latest.txt';
const FALLBACK_LOC = { lat: 42.3601, lon: -71.0589, label: 'Boston, MA (fallback)' };
const CANVAS_MIN = 240; // minimum height if screen is small (lower for phones)
// Last-modified time for TLE file (embedded at build time)
const TLE_MTIME = new Date('2025-11-10T21:13:21.2497508Z');

// Major world cities for light pollution analysis
const MAJOR_CITIES = [
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { name: 'Delhi', lat: 28.7041, lon: 77.1025 },
  { name: 'Shanghai', lat: 31.2304, lon: 121.4737 },
  { name: 'São Paulo', lat: -23.5505, lon: -46.6333 },
  { name: 'Mexico City', lat: 19.4326, lon: -99.1332 },
  { name: 'Cairo', lat: 30.0444, lon: 31.2357 },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  { name: 'Beijing', lat: 39.9042, lon: 116.4074 },
  { name: 'Dhaka', lat: 23.8103, lon: 90.4125 },
  { name: 'Osaka', lat: 34.6937, lon: 135.5023 },
  { name: 'New York', lat: 40.7128, lon: -74.0060 },
  { name: 'Karachi', lat: 24.8607, lon: 67.0011 },
  { name: 'Buenos Aires', lat: -34.6037, lon: -58.3816 },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
  { name: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  { name: 'Jakarta', lat: -6.2088, lon: 106.8456 },
  { name: 'London', lat: 51.5074, lon: -0.1278 },
  { name: 'Paris', lat: 48.8566, lon: 2.3522 },
  { name: 'Moscow', lat: 55.7558, lon: 37.6173 },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
  { name: 'Toronto', lat: 43.6532, lon: -79.3832 },
  { name: 'Istanbul', lat: 41.0082, lon: 28.9784 },
  { name: 'Dubai', lat: 25.2048, lon: 55.2708 },
  { name: 'Singapore', lat: 1.3521, lon: 103.8198 },
  { name: 'Hong Kong', lat: 22.3193, lon: 114.1694 },
  { name: 'Bangkok', lat: 13.7563, lon: 100.5018 },
  { name: 'Boston', lat: 42.3601, lon: -71.0589 },
  { name: 'San Francisco', lat: 37.7749, lon: -122.4194 },
  { name: 'Chicago', lat: 41.8781, lon: -87.6298 },
];

// --- DOM Elements (will be initialized when DOM is ready) ---
let plot, ctx, locPill, clockPill, siteLabel, satListEl, countsEl, tlePill;
let refreshBtn, toggleBtn, elevCutEl, altCutEl, filterTextEl, nightBtn, namesBtn;
let sortSelect, colorizeBtn, colorLegend, colorBar, colorMin, colorMax;
let colorLegendVert, colorBarVert, colorMinVert, colorMaxVert;

// Initialize DOM element references (called from main.js after DOM is ready)
function initializeDOMElements(){
  plot = document.getElementById('plot');
  ctx = plot.getContext('2d');
  locPill = document.getElementById('locPill');
  clockPill = document.getElementById('clockPill');
  siteLabel = document.getElementById('siteLabel');
  satListEl = document.getElementById('satList');
  countsEl = document.getElementById('counts');
  tlePill = document.getElementById('tlePill');
  refreshBtn = document.getElementById('refreshBtn');
  toggleBtn = document.getElementById('toggleBtn');
  elevCutEl = document.getElementById('elevCut');
  altCutEl = document.getElementById('altCut');
  filterTextEl = document.getElementById('filterText');
  nightBtn = document.getElementById('nightBtn');
  namesBtn = document.getElementById('namesBtn');
  sortSelect = document.getElementById('sortSelect');
  colorizeBtn = document.getElementById('colorizeBtn');
  colorLegend = document.getElementById('colorLegend');
  colorBar = document.getElementById('colorBar');
  colorMin = document.getElementById('colorMin');
  colorMax = document.getElementById('colorMax');
  colorLegendVert = document.getElementById('colorLegendVert');
  colorBarVert = document.getElementById('colorBarVert');
  colorMinVert = document.getElementById('colorMinVert');
  colorMaxVert = document.getElementById('colorMaxVert');
  console.log('DOM init:', plot ? 'OK' : 'NULL');
}
