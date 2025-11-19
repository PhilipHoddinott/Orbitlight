// App script extracted from index.html
// Assumes satellite.js is loaded in the page beforehand

// --- Config ---
const DATA_URL = 'data/tle_latest.txt';
const FALLBACK_LOC = { lat: 42.3601, lon: -71.0589, label: 'Boston, MA (fallback)' };
const CANVAS_MIN = 240; // minimum height if screen is small (lower for phones)
// Last-modified time for TLE file (fetched from server)
let TLE_MTIME = null;

// --- State ---
let satRecords = []; // { name, l1, l2, satrec }
let observer = { lat: FALLBACK_LOC.lat, lon: FALLBACK_LOC.lon, alt: 0, label: FALLBACK_LOC.label };
let running = true;
let rafId = null;
const selectedNames = new Set();
let lastDrawn = []; // [{name,x,y}]
const HIT_R = 10;
// UI state
let showAllNames = false;
let sortKey = 'altitude';
let colorize = false;
let lastItems = []; // last computed visible items

// --- Elements ---
const plot = document.getElementById('plot');
const ctx = plot.getContext('2d');
const locPill = document.getElementById('locPill');
const clockPill = document.getElementById('clockPill');
const siteLabel = document.getElementById('siteLabel');
const satListEl = document.getElementById('satList');
const countsEl = document.getElementById('counts');
const tlePill = document.getElementById('tlePill');
const refreshBtn = document.getElementById('refreshBtn');
const toggleBtn = document.getElementById('toggleBtn');
const elevCutEl = document.getElementById('elevCut');
const altCutEl = document.getElementById('altCut');
const filterTextEl = document.getElementById('filterText');
const nightBtn = document.getElementById('nightBtn');
const namesBtn = document.getElementById('namesBtn');
const sortSelect = document.getElementById('sortSelect');
const colorizeBtn = document.getElementById('colorizeBtn');
const colorLegend = document.getElementById('colorLegend');
const colorBar = document.getElementById('colorBar');
const colorMin = document.getElementById('colorMin');
const colorMax = document.getElementById('colorMax');
const colorLegendVert = document.getElementById('colorLegendVert');
const colorBarVert = document.getElementById('colorBarVert');
const colorMinVert = document.getElementById('colorMinVert');
const colorMaxVert = document.getElementById('colorMaxVert');
// ensure control initial state
sortSelect.value = sortKey;

// --- Helpers ---
function fmt(n, d=1) { return Number(n).toFixed(d); }
function deg2rad(d){ return d * Math.PI / 180; }
function rad2deg(r){ return r * 180 / Math.PI; }
function pad2(n){ return String(Math.floor(n)).padStart(2,'0'); }

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

// Calculate bearing from observer to city (0°=N, 90°=E, 180°=S, 270°=W)
function calcBearing(lat1, lon1, lat2, lon2) {
  const dLon = deg2rad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(deg2rad(lat2));
  const x = Math.cos(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) - Math.sin(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(dLon);
  const bearing = Math.atan2(y, x);
  return (rad2deg(bearing) + 360) % 360; // 0-360 degrees
}

// Convert bearing to compass direction
function bearingToDir(bearing) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(bearing / 22.5) % 16];
}

// Haversine distance in km
function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Find nearest major city and return info string
function getNearestCity(lat, lon) {
  let nearest = null;
  let minDist = Infinity;
  MAJOR_CITIES.forEach(city => {
    const dist = calcDistance(lat, lon, city.lat, city.lon);
    if(dist < minDist) {
      minDist = dist;
      nearest = { ...city, dist };
    }
  });
  if(!nearest) return '';
  const bearing = calcBearing(lat, lon, nearest.lat, nearest.lon);
  const dir = bearingToDir(bearing);
  const miles = Math.round(minDist / 1.60934); // km to miles
  return `Nearest Big City: ${nearest.name}, ${miles} miles ${dir}`;
}

// --- Color helpers ---
function nameToColor(n){
  let h = 0; for(let i=0;i<n.length;i++) h = (h<<5) - h + n.charCodeAt(i);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 70% 60%)`;
}

function valueToColorRange(minV, maxV, v){
  if(minV === maxV) return 'hsl(200 80% 60%)';
  const t = (v - minV) / (maxV - minV);
  const hue = 220 - 220 * t; // 220->0
  return `hsl(${Math.round(hue)} 85% 60%)`;
}

function buildNameGradient(){
  // a multi-stop hue gradient for names
  const stops = [];
  for(let i=0;i<=6;i++){ const h = Math.round(i * 60); stops.push(`hsl(${h} 70% 60%) ${Math.round((i/6)*100)}%`); }
  return `linear-gradient(90deg, ${stops.join(',')})`;
}

function updateTleAge(now){
  if(!tlePill) return;
  if(!TLE_MTIME) {
    tlePill.textContent = '—';
    return;
  }
  const then = TLE_MTIME.getTime();
  const diffMs = Math.max(0, now.getTime() - then);
  const s = Math.floor(diffMs / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  tlePill.textContent = `${pad2(hh)}:${pad2(mm)}:${pad2(ss)} since last TLE update`;
}

function resizeCanvas(){
  const rect = plot.parentElement.getBoundingClientRect();
  const cssSize = Math.max(Math.min(rect.width, 600), CANVAS_MIN);
  plot.style.width = cssSize + 'px';
  plot.style.height = cssSize + 'px';
  const dpr = window.devicePixelRatio || 1;
  plot.width = Math.floor(cssSize * dpr);
  plot.height = Math.floor(cssSize * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0,0,plot.width,plot.height);
}

function drawPolarGrid(){
  const dpr = window.devicePixelRatio || 1;
  const w = plot.width / dpr, h = plot.height / dpr;
  const cx = w/2, cy = h/2; const R = Math.min(cx, cy) - 20;
  ctx.clearRect(0,0,w,h);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineWidth = 1;
  
  const elevCut = Number(elevCutEl.value) || 0;
  const gridCol = getComputedStyle(document.documentElement).getPropertyValue('--grid');
  const accentCol = getComputedStyle(document.documentElement).getPropertyValue('--accent');
  
  const rings = [0, elevCut, 30, 60, 90];
  const uniqueRings = [...new Set(rings)].sort((a,b)=>a-b);
  
  uniqueRings.forEach(el => {
    const r = R * (1 - el/90);
    ctx.strokeStyle = (el === elevCut && el !== 0) ? accentCol : gridCol;
    ctx.beginPath();
    ctx.arc(0,0,r, 0, Math.PI*2);
    ctx.stroke();
  });
  
  ctx.strokeStyle = gridCol;
  ctx.beginPath();
  for(let az=0; az<360; az+=30){
    const a = deg2rad(az);
    ctx.moveTo(0,0);
    ctx.lineTo(R*Math.sin(a), -R*Math.cos(a));
  }
  ctx.stroke();
  
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted');
  ctx.font = '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cardinals = [ ['N',0], ['E',90], ['S',180], ['W',270] ];
  cardinals.forEach(([t,az])=>{
    const a = deg2rad(az);
    ctx.fillText(t, (R+12)*Math.sin(a), -(R+12)*Math.cos(a));
  });
  
  uniqueRings.forEach(el=>{
    const r = R * (1 - el/90);
    ctx.fillText(el + '°', 0, -r);
  });
  ctx.restore();
}

function parseTLEs(text){
  const lines = text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const out = [];
  for(let i=0;i<lines.length;){
      // Check for old format: "0 NAME"
      if(lines[i].startsWith('0 ')){
      const name = lines[i].slice(2).trim();
      const l1 = lines[i+1];
      const l2 = lines[i+2];
      if(l1 && l2 && l1.startsWith('1') && l2.startsWith('2')){
        out.push({ name, l1, l2 });
        i += 3;
      } else { i++; }
      } 
      else if(lines[i].startsWith('1') && lines[i+1] && lines[i+1].startsWith('2')){
        const name = 'UNKNOWN_' + out.length;
        out.push({ name, l1: lines[i], l2: lines[i+1] });
        i += 2;
      }
      else if(!lines[i].startsWith('1') && !lines[i].startsWith('2') && lines[i+1] && lines[i+1].startsWith('1') && lines[i+2] && lines[i+2].startsWith('2')){
        const name = lines[i];
        const l1 = lines[i+1];
        const l2 = lines[i+2];
        out.push({ name, l1, l2 });
        i += 3;
      }
      else {
      i++;
    }
  }
  return out.map(s=> ({ ...s, satrec: satellite.twoline2satrec(s.l1, s.l2) }));
}

function getLookAngles(satrec, date, obs){
  const pv = satellite.propagate(satrec, date);
  if(!pv.position) return null;
  const positionEci = pv.position; // km
  const gmst = satellite.gstime(date);
  const positionEcf = satellite.eciToEcf(positionEci, gmst);
  const observerGd = { longitude: deg2rad(obs.lon), latitude: deg2rad(obs.lat), height: obs.alt || 0 };
  const look = satellite.ecfToLookAngles(observerGd, positionEcf);
  const geo = satellite.eciToGeodetic(positionEci, gmst);
  return {
    az: rad2deg(look.azimuth),
    el: rad2deg(look.elevation),
    range: look.rangeSat,
    altKm: geo.height,
    positionEcf: positionEcf  // Include ECF position for vector calculations
  };
}

// track last look angles to compute per-frame angular speed (deg/s) using vector method
const lastAngles = new Map(); // name -> {az,el,range,t}

// Compute angle between two vectors (in degrees) using dot product
function angleBetweenVectors(v1, v2) {
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
  if(mag1 === 0 || mag2 === 0) return 0;
  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2))); // clamp to [-1,1]
  return rad2deg(Math.acos(cosAngle));
}

function polarToCanvas(azDeg, elDeg){
  const dpr = window.devicePixelRatio || 1;
  const w = plot.width / dpr, h = plot.height / dpr;
  const cx = w/2, cy = h/2; const R = Math.min(cx, cy) - 20;
  const r = R * (1 - Math.max(0, Math.min(90, elDeg)) / 90);
  const a = deg2rad(azDeg);
  const x = cx + r * Math.sin(a);
  const y = cy - r * Math.cos(a);
  return { x, y };
}

function drawSatellites(items){
  lastDrawn = [];
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent');
  const muted = getComputedStyle(document.documentElement).getPropertyValue('--muted');

  let metricVals = null;
  if(colorize){
    if(sortKey === 'altitude') metricVals = items.map(it => it.altKm || 0);
    else if(sortKey === 'speed') metricVals = items.map(it => it.speed || 0);
    else if(sortKey === 'distance') metricVals = items.map(it => it.range || 0);
  }
  const minV = metricVals && metricVals.length ? Math.min(...metricVals) : 0;
  const maxV = metricVals && metricVals.length ? Math.max(...metricVals) : minV;

  items.forEach(({ name, az, el, speed, altKm, range })=>{
    const p = polarToCanvas(az, el);
    lastDrawn.push({ name, x: p.x, y: p.y });
    const selected = selectedNames.has(name);
    ctx.beginPath();
    let fill = accent;
    if(colorize){
      if(sortKey === 'name') fill = nameToColor(name);
      else if(sortKey === 'altitude') fill = valueToColorRange(minV, maxV, altKm || 0);
      else if(sortKey === 'speed') fill = valueToColorRange(minV, maxV, speed || 0);
      else if(sortKey === 'distance') fill = valueToColorRange(minV, maxV, range || 0);
      }
    ctx.fillStyle = fill;
    ctx.arc(p.x, p.y, selected ? 6 : 4, 0, Math.PI*2);
    ctx.fill();
    if(selected || showAllNames){
      ctx.fillStyle = selected ? '#cfe3ff' : muted;
      ctx.font = '11px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const label = (speed != null) ? `${name} (${fmt(speed,2)}°/s)` : name;
      ctx.fillText(label, p.x + 8, p.y);
    }
  });
}

function updateList(items){
  const f = filterTextEl.value.trim().toLowerCase();
  const filtered = items.filter(it => (!f || it.name.toLowerCase().includes(f)));
  countsEl.textContent = `${filtered.length} visible`;

  satListEl.innerHTML = '';
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent');
  let metricVals = null;
  if(colorize){
    if(sortKey === 'altitude') metricVals = filtered.map(it => it.altKm || 0);
    else if(sortKey === 'speed') metricVals = filtered.map(it => it.speed || 0);
    else if(sortKey === 'distance') metricVals = filtered.map(it => it.range || 0);
  }
  const minV = metricVals && metricVals.length ? Math.min(...metricVals) : 0;
  const maxV = metricVals && metricVals.length ? Math.max(...metricVals) : minV;

  filtered.sort((a,b)=>{
    if(sortKey === 'name') return a.name.localeCompare(b.name);
    if(sortKey === 'altitude') return (b.altKm || 0) - (a.altKm || 0);
    if(sortKey === 'speed') return (b.speed || 0) - (a.speed || 0);
    if(sortKey === 'distance') return (a.range || 0) - (b.range || 0);
    return b.el - a.el;
  }).forEach(it=>{
    const div = document.createElement('div');
    div.className = 'satItem';
    div.setAttribute('data-name', it.name);
    const left = document.createElement('div');
    left.innerHTML = `<div style="font-weight:600;"><span class="satName">${it.name}</span></div><div class="meta">Az ${fmt(it.az,0)}° · El ${fmt(it.el,0)}° · Alt ${fmt(it.altKm,0)} km · Range ${fmt(it.range,0)} km · Speed ${fmt(it.speed||0,2)}°/s</div>`;
    const right = document.createElement('div');
    const isSel = selectedNames.has(it.name);
    right.innerHTML = `<span class="pill">${isSel ? 'selected' : 'tap to select'}</span>`;
    div.appendChild(left); div.appendChild(right);
    const nameSpan = div.querySelector('.satName');
    if(nameSpan){
      if(colorize){
        let c = accent;
        if(sortKey === 'name') c = nameToColor(it.name);
        else if(sortKey === 'altitude') c = valueToColorRange(minV, maxV, it.altKm || 0);
        else if(sortKey === 'speed') c = valueToColorRange(minV, maxV, it.speed || 0);
        else if(sortKey === 'distance') c = valueToColorRange(minV, maxV, it.range || 0);
        nameSpan.style.color = c;
      } else { nameSpan.style.color = ''; }
    }
    satListEl.appendChild(div);
  });
  updateColorLegend(filtered, minV, maxV);
}

function updateColorLegend(items, minV, maxV){
  if(!colorize || !items || items.length === 0){
    if(colorLegend) colorLegend.style.display = 'none';
    if(colorLegendVert) colorLegendVert.style.display = 'none';
    return;
  }
  const desktop = window.innerWidth >= 1000;
  if(colorLegend) colorLegend.style.display = desktop ? 'none' : 'flex';
  if(colorLegendVert) colorLegendVert.style.display = desktop ? 'flex' : 'none';

  if(sortKey === 'name'){
    const gH = buildNameGradient();
    if(colorBar) colorBar.style.background = gH;
    if(colorBarVert) colorBarVert.style.background = gH.replace('90deg','180deg');
    if(colorMin) colorMin.textContent = '';
    if(colorMax) colorMax.textContent = '';
    if(colorMinVert) colorMinVert.textContent = 'Z';
    if(colorMaxVert) colorMaxVert.textContent = 'A';
  } else {
    const stops = [];
    const steps = 10;
    for(let i=0;i<=steps;i++){
      const t = i/steps;
      const v = minV + (maxV - minV) * t;
      const c = valueToColorRange(minV, maxV, v);
      stops.push(`${c} ${Math.round(t*100)}%`);
    }
    const horiz = `linear-gradient(90deg, ${stops.join(',')})`;
    const vertStops = stops.slice().reverse();
    const vert = `linear-gradient(180deg, ${vertStops.join(',')})`;
    if(colorBar) colorBar.style.background = horiz;
    if(colorBarVert) colorBarVert.style.background = vert;
    const unit = (sortKey === 'altitude' || sortKey === 'distance') ? 'km' : '°/s';
    if(colorMin) colorMin.textContent = `${fmt(minV,0)} ${unit}`;
    if(colorMax) colorMax.textContent = `${fmt(maxV,0)} ${unit}`;
    if(colorMaxVert) colorMaxVert.textContent = `${fmt(maxV,0)} ${unit}`;
    if(colorMinVert) colorMinVert.textContent = `${fmt(minV,0)} ${unit}`;
  }
}

function tick(){
  const now = new Date();
  const localTimeStr = new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(now);
  clockPill.textContent = localTimeStr;
  updateTleAge(now);
  const elevCut = Number(elevCutEl.value) || 0;
  const altCut = Number(altCutEl.value) || 1000;

  const itemsAll = satRecords.map(s => {
    const look = getLookAngles(s.satrec, now, observer);
    if(!look) return null;
    return { name: s.name, az: look.az, el: look.el, range: look.range, altKm: look.altKm, positionEcf: look.positionEcf };
  }).filter(Boolean);

  const items = itemsAll.filter(it => it.el >= elevCut && it.altKm <= altCut);
  lastItems = items;
  const obsGd = { longitude: deg2rad(observer.lon), latitude: deg2rad(observer.lat), height: observer.alt || 0 };
  const obsEcf = satellite.geodeticToEcf(obsGd);

  items.forEach(it => {
    const prev = lastAngles.get(it.name);
    let speed = 0;
    if(prev && prev.positionEcf){
      const dt = (now.getTime() - prev.t) / 1000;
      if(dt > 0){
        const v1 = { x: it.positionEcf.x - obsEcf.x, y: it.positionEcf.y - obsEcf.y, z: it.positionEcf.z - obsEcf.z };
        const v2 = { x: prev.positionEcf.x - obsEcf.x, y: prev.positionEcf.y - obsEcf.y, z: prev.positionEcf.z - obsEcf.z };
        const angleDeg = angleBetweenVectors(v1, v2);
        speed = angleDeg / dt;
      }
    }
    it.speed = speed;
    lastAngles.set(it.name, { positionEcf: it.positionEcf, t: now.getTime() });
  });
  const namesInFov = new Set(items.map(i=>i.name));
  for(const n of Array.from(selectedNames)){
    if(!namesInFov.has(n)) selectedNames.delete(n);
  }

  drawPolarGrid();
  drawSatellites(items);
  updateList(items);

  if(running){
    rafId = requestAnimationFrame(tick);
  }
}

async function loadTLE(){
  // Fetch TLE file and get its last-modified time
  const res = await fetch(DATA_URL, { method: 'GET', cache: 'no-store' });
  if(!res.ok){ throw new Error(`Failed to fetch ${DATA_URL}: ${res.status}`); }
  const text = await res.text();
  
  // Try to parse timestamp from first line of file (format: # TLE Data Last Updated: YYYY-MM-DDTHH:MM:SSZ)
  const lines = text.split(/\r?\n/);
  const timestampLine = lines[0];
  if(timestampLine && timestampLine.startsWith('# TLE Data Last Updated:')) {
    const timestampStr = timestampLine.replace('# TLE Data Last Updated:', '').trim();
    TLE_MTIME = new Date(timestampStr);
    console.log('TLE timestamp from file:', timestampStr, '→', TLE_MTIME);
  } else {
    // Fallback: try Last-Modified header
    const lastMod = res.headers.get('Last-Modified');
    if(lastMod) {
      TLE_MTIME = new Date(lastMod);
      console.log('TLE Last-Modified from server:', lastMod, '→', TLE_MTIME);
    } else {
      // Final fallback: use current time
      TLE_MTIME = new Date();
      console.warn('No timestamp found in file or Last-Modified header; using current time as fallback');
    }
  }
  
  satRecords = parseTLEs(text);
  if(!satRecords.length) throw new Error('No TLEs parsed.');
}

function setObserver(geo){
  observer = { lat: geo.lat, lon: geo.lon, alt: geo.alt || 0, label: geo.label || `${fmt(geo.lat,4)}, ${fmt(geo.lon,4)}` };
  siteLabel.textContent = observer.label;
  const nearestCity = getNearestCity(observer.lat, observer.lon);
  locPill.innerHTML = `<div>Observer: ${fmt(observer.lat,4)}°, ${fmt(observer.lon,4)}°</div><div style="font-size:11px; color:var(--muted); margin-top:2px;">${nearestCity}</div>`;
}

function tryGeolocate(){
  if(!('geolocation' in navigator)){
    setObserver(FALLBACK_LOC);
    return;
  }
  const opts = { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 };
  navigator.geolocation.getCurrentPosition(
    (pos)=>{
      const { latitude, longitude } = pos.coords;
      setObserver({ lat: latitude, lon: longitude, label: 'Your device location' });
    },
    (err)=>{
      locPill.classList.add('warn');
      locPill.textContent = `Using fallback (Boston): ${err.message || 'permission denied'}`;
      setObserver(FALLBACK_LOC);
    },
    opts
  );
}

// --- Events ---
satListEl.addEventListener('click', (e)=>{
  const item = e.target.closest('.satItem');
  if(!item) return;
  const name = item.getAttribute('data-name');
  if(!name) return;
  if(selectedNames.has(name)) selectedNames.delete(name); else selectedNames.add(name);
  drawPolarGrid();
  drawSatellites(lastItems);
  updateList(lastItems);
});

filterTextEl.addEventListener('input', ()=>{
  updateList(lastItems);
});

namesBtn.addEventListener('click', ()=>{
  showAllNames = !showAllNames;
  namesBtn.textContent = showAllNames ? 'Names: On' : 'Names: Off';
  drawPolarGrid();
  drawSatellites(lastItems);
});

nightBtn.addEventListener('click', ()=>{
  const on = document.body.classList.toggle('night');
  nightBtn.textContent = on ? 'Night: On' : 'Night: Off';
});

sortSelect.addEventListener('change', ()=>{
  sortKey = sortSelect.value || 'name';
  updateList(lastItems);
  drawPolarGrid();
  drawSatellites(lastItems);
});

colorizeBtn.addEventListener('click', ()=>{
  colorize = !colorize;
  colorizeBtn.textContent = colorize ? 'Colorize: On' : 'Colorize: Off';
  drawPolarGrid();
  drawSatellites(lastItems);
});

// --- Boot ---
(async function init(){
  try {
    resizeCanvas();
    tryGeolocate();
    await loadTLE();
    drawPolarGrid();
    tick();

    // Setup help modal listeners (after DOM is ready)
    const helpModal = document.getElementById('helpModal');
    const helpLink = document.getElementById('helpLink');
    const helpClose = document.getElementById('helpClose');
    const helpCloseBtn = document.getElementById('helpCloseBtn');

    if(helpLink && helpModal && helpClose && helpCloseBtn) {
      helpLink.addEventListener('click', () => {
        helpModal.style.display = 'block';
      });

      const closeHelp = () => {
        helpModal.style.display = 'none';
      };

      helpClose.addEventListener('click', closeHelp);
      helpCloseBtn.addEventListener('click', closeHelp);

      helpModal.addEventListener('click', (e) => {
        if(e.target === helpModal) closeHelp();
      });
    }
  } catch (e){
    console.error(e);
    const msg = document.createElement('div');
    msg.className = 'card error';
    msg.style.margin = '16px';
    msg.textContent = 'Error: ' + (e && e.message ? e.message : e);
    document.body.appendChild(msg);
  }
})();
