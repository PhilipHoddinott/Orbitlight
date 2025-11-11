// Orbital mechanics: propagation and look angle calculations

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
