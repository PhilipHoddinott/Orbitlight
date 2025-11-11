// UI state and event handlers

// --- State ---
let satRecords = []; // { name, l1, l2, satrec }
let observer = { lat: FALLBACK_LOC.lat, lon: FALLBACK_LOC.lon, alt: 0, label: FALLBACK_LOC.label };
let running = true;
let rafId = null;
const selectedNames = new Set();
let lastDrawn = []; // [{name,x,y}]
const HIT_R = 10;
let showAllNames = false;
let sortKey = 'altitude';
let colorize = false;
let lastItems = []; // last computed visible items
const lastAngles = new Map(); // name -> {positionEcf, t}

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

// --- Event Handler Setup ---
function setupEventHandlers(){
  // Initialize sort control state
  sortSelect.value = sortKey;

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

  toggleBtn.addEventListener('click', ()=>{
    running = !running;
    toggleBtn.textContent = running ? 'Pause' : 'Resume';
    if(running) tick();
  });

  refreshBtn.addEventListener('click', async ()=>{
    try {
      satRecords = await loadTLE();
      console.log('TLE reloaded');
    } catch (e){
      console.error('Error reloading TLE:', e);
    }
  });

  // Window resize handler
  window.addEventListener('resize', ()=>{
    resizeCanvas();
  });
}
