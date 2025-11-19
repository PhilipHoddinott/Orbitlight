// Canvas rendering: grid, satellites, layout

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
    // Flip horizontal axis so East appears on the left (lying-down view)
    ctx.lineTo(-R*Math.sin(a), -R*Math.cos(a));
  }
  ctx.stroke();
  
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted');
  ctx.font = '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cardinals = [ ['N',0], ['E',90], ['S',180], ['W',270] ];
  cardinals.forEach(([t,az])=>{
    const a = deg2rad(az);
    // Flip horizontal axis for label positions as well
    ctx.fillText(t, -(R+12)*Math.sin(a), -(R+12)*Math.cos(a));
  });
  
  uniqueRings.forEach(el=>{
    const r = R * (1 - el/90);
    ctx.fillText(el + '°', 0, -r);
  });
  ctx.restore();
}

function polarToCanvas(azDeg, elDeg){
  const dpr = window.devicePixelRatio || 1;
  const w = plot.width / dpr, h = plot.height / dpr;
  const cx = w/2, cy = h/2; const R = Math.min(cx, cy) - 20;
  const r = R * (1 - Math.max(0, Math.min(90, elDeg)) / 90);
  const a = deg2rad(azDeg);
  // Flip horizontal axis so East is left and West is right (lying-down view)
  const x = cx - r * Math.sin(a);
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
