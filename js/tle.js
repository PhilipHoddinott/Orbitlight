// TLE parsing and satellite record loading

function parseTleEpochDate(line1){
  if(!line1 || line1.length < 32) return null;
  // TLE epoch field (YYDDD.DDDDDDDD) lives at columns 19-32 in line 1.
  const epochField = line1.slice(18, 32).trim();
  const m = epochField.match(/^(\d{2})(\d{3}(?:\.\d+)?)$/);
  if(!m) return null;

  const yy = Number(m[1]);
  const dayOfYear = Number(m[2]);
  if(Number.isNaN(yy) || Number.isNaN(dayOfYear) || dayOfYear <= 0) return null;

  // NORAD convention: 57-99 => 1957-1999, 00-56 => 2000-2056.
  const fullYear = yy >= 57 ? 1900 + yy : 2000 + yy;
  const dayInt = Math.floor(dayOfYear);
  const dayFrac = dayOfYear - dayInt;
  const ms = Date.UTC(fullYear, 0, 1) + ((dayInt - 1) * 86400000) + (dayFrac * 86400000);
  return new Date(ms);
}

function getLatestTleEpoch(records){
  let latest = null;
  for(const rec of records){
    const epochDate = parseTleEpochDate(rec.l1);
    if(epochDate && (!latest || epochDate > latest)){
      latest = epochDate;
    }
  }
  return latest;
}

function parseTLEs(text){
  const lines = text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  console.log(`parseTLEs: ${lines.length} non-empty lines`);
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
  console.log(`parseTLEs: Parsed ${out.length} TLE records`);
  return out.map(s=> {
    const satrec = satellite.twoline2satrec(s.l1, s.l2);
    console.log(`  - ${s.name}: satrec.error = ${satrec.error}`);
    return { ...s, satrec };
  });
}

async function loadTLE(){
  console.log('loadTLE: Starting fetch...');
  console.log('satellite object exists?', typeof satellite !== 'undefined');
  const res = await fetch(DATA_URL, { cache: 'no-store' });
  if(!res.ok){ throw new Error(`Failed to fetch ${DATA_URL}: ${res.status}`); }
  const text = await res.text();
  console.log(`Fetched TLE file, ${text.length} characters`);
  const records = parseTLEs(text);
  console.log(`Parsed ${records.length} TLE records`);
  if(!records.length) throw new Error('No TLEs parsed.');

  const latestEpoch = getLatestTleEpoch(records);
  if(latestEpoch){
    TLE_MTIME = latestEpoch;
    console.log('TLE_MTIME set from latest TLE epoch:', TLE_MTIME.toISOString());
  } else {
    const lastModified = res.headers.get('Last-Modified');
    if(lastModified){
      const parsed = new Date(lastModified);
      if(!Number.isNaN(parsed.getTime())){
        TLE_MTIME = parsed;
        console.log('TLE_MTIME set from Last-Modified header:', TLE_MTIME.toISOString());
      }
    }
    if(!TLE_MTIME){
      TLE_MTIME = new Date();
      console.warn('Could not parse a TLE epoch or Last-Modified header; using current time fallback.');
    }
  }

  return records;
}
