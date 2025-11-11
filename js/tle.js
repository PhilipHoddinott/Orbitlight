// TLE parsing and satellite record loading

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
  const res = await fetch(DATA_URL);
  if(!res.ok){ throw new Error(`Failed to fetch ${DATA_URL}: ${res.status}`); }
  const text = await res.text();
  console.log(`Fetched TLE file, ${text.length} characters`);
  const records = parseTLEs(text);
  console.log(`Parsed ${records.length} TLE records`);
  if(!records.length) throw new Error('No TLEs parsed.');
  return records;
}
