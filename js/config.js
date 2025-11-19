// Configuration constants and DOM element references

// --- Config Constants ---
const DATA_URL = 'data/tle_latest.txt';
const FALLBACK_LOC = { lat: 42.3601, lon: -71.0589, label: 'Boston, MA (fallback)' };
const CANVAS_MIN = 240; // minimum height if screen is small (lower for phones)
// Last-modified time for TLE file (embedded at build time)
const TLE_MTIME = new Date('2025-11-10T21:13:21.2497508Z');

// MAJOR_CITIES is now loaded from js/cities.js

// --- DOM Elements (will be initialized when DOM is ready) ---
let plot, ctx, locPill, clockPill, siteLabel, satListEl, countsEl, tlePill;
let refreshBtn, toggleBtn, elevCutEl, altCutEl, filterTextEl, nightBtn, namesBtn;
let sortSelect, colorizeBtn, colorLegend, colorBar, colorMin, colorMax;
let colorLegendVert, colorBarVert, colorMinVert, colorMaxVert;
let manualLoc, applyLocBtn;

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
  manualLoc = document.getElementById('manualLoc');
  applyLocBtn = document.getElementById('applyLocBtn');
  console.log('DOM init:', plot ? 'OK' : 'NULL');
}
