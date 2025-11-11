// Main entry point: initialization and animation loop

// Debug logging helper
function debugLog(msg) {
  console.log(msg);
  const debug = document.getElementById('debugInfo');
  if(debug) {
    debug.innerHTML += msg + '<br>';
    debug.scrollTop = debug.scrollHeight;
  }
}

// Animation loop: propagate, compute angles, render, update UI
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
  if(items.length === 0 && lastItems.length > 0){
    // Don't log every frame if we already logged
  } else if(items.length > 0 || itemsAll.length > 0){
    debugLog(`Sats: ${itemsAll.length} total, ${items.length} above ${elevCut}°`);
  }
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

// Initialization
async function startApp(){
  try {
    debugLog('Init start');
    initializeDOMElements();
    debugLog('DOM init done');
    setupEventHandlers();
    debugLog('Handlers set up');
    resizeCanvas();
    debugLog('Canvas resized');
    tryGeolocate();
    debugLog('Geolocation initiated');
    satRecords = await loadTLE();
    debugLog(`Loaded ${satRecords.length} sats`);
    drawPolarGrid();
    debugLog('Grid drawn');
    tick();
    
    // Setup help modal listeners
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
    debugLog('ERROR: ' + e.message);
    console.error(e);
    const msg = document.createElement('div');
    msg.className = 'card error';
    msg.style.margin = '16px';
    msg.textContent = 'Error: ' + (e && e.message ? e.message : e);
    document.body.appendChild(msg);
  }
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', startApp);
