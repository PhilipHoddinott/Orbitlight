// Color mapping and legend management

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
  if(!tlePill || !TLE_MTIME) return;
  const then = TLE_MTIME.getTime();
  const diffMs = Math.max(0, now.getTime() - then);
  const s = Math.floor(diffMs / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  tlePill.textContent = `${pad2(hh)}:${pad2(mm)}:${pad2(ss)} since last TLE update`;
}

function updateColorLegend(items, minV, maxV){
  // hide legends when not colorizing or no items
  if(!colorize || !items || items.length === 0){
    if(colorLegend) colorLegend.style.display = 'none';
    if(colorLegendVert) colorLegendVert.style.display = 'none';
    return;
  }

  // choose which legend to show based on viewport width: vertical on desktop, inline on phone
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
    // numeric: build multi-stop gradient for smoother spectrum
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
