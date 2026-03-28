// Peak Sun Hours lookup table: latitude bands every 5° from 0-65°
// Values are monthly PSH (Jan-Dec) based on typical horizontal irradiance data.
// Source: aggregated from PVGIS / NASA SSE for representative locations.
const PSH_TABLE = [
  { lat:  0, psh: [5.1, 5.2, 5.2, 5.0, 4.8, 4.5, 4.5, 4.7, 5.0, 5.1, 5.0, 5.0] },
  { lat:  5, psh: [5.3, 5.5, 5.5, 5.2, 4.8, 4.4, 4.3, 4.5, 4.9, 5.1, 5.1, 5.1] },
  { lat: 10, psh: [5.4, 5.7, 5.8, 5.4, 4.9, 4.4, 4.2, 4.4, 4.9, 5.2, 5.2, 5.1] },
  { lat: 15, psh: [5.3, 5.7, 6.0, 5.7, 5.1, 4.5, 4.2, 4.4, 4.9, 5.2, 5.1, 4.9] },
  { lat: 20, psh: [4.9, 5.5, 6.0, 5.9, 5.5, 4.8, 4.5, 4.6, 5.0, 5.2, 4.9, 4.6] },
  { lat: 25, psh: [4.3, 5.0, 5.8, 6.0, 5.8, 5.2, 4.8, 4.8, 5.0, 5.0, 4.5, 4.1] },
  { lat: 30, psh: [3.6, 4.4, 5.4, 5.9, 6.0, 5.7, 5.3, 5.1, 4.9, 4.5, 3.8, 3.4] },
  { lat: 35, psh: [2.9, 3.7, 4.8, 5.6, 6.1, 6.0, 5.7, 5.3, 4.6, 3.8, 3.1, 2.7] },
  { lat: 40, psh: [2.2, 3.1, 4.2, 5.2, 5.9, 6.2, 6.0, 5.4, 4.3, 3.2, 2.4, 2.0] },
  { lat: 45, psh: [1.7, 2.5, 3.7, 4.8, 5.7, 6.1, 5.9, 5.2, 3.9, 2.7, 1.8, 1.4] },
  { lat: 50, psh: [1.3, 2.0, 3.2, 4.4, 5.4, 5.8, 5.6, 4.8, 3.4, 2.2, 1.3, 1.0] },
  { lat: 55, psh: [0.8, 1.5, 2.7, 4.0, 5.2, 5.7, 5.4, 4.4, 2.9, 1.7, 0.9, 0.6] },
  { lat: 60, psh: [0.4, 1.0, 2.1, 3.5, 4.9, 5.5, 5.1, 3.9, 2.4, 1.2, 0.5, 0.3] },
  { lat: 65, psh: [0.1, 0.5, 1.5, 3.0, 4.5, 5.3, 4.8, 3.4, 1.9, 0.7, 0.2, 0.1] },
];

/**
 * Get 12 monthly Peak Sun Hours for a given latitude.
 * Linearly interpolates between 5-degree table bands.
 * Clamps latitude to [0, 65].
 */
export function getPSH(latitude) {
  const lat = Math.max(0, Math.min(65, latitude));

  // Find surrounding table entries
  let lower = PSH_TABLE[0];
  let upper = PSH_TABLE[0];

  for (let i = 0; i < PSH_TABLE.length - 1; i++) {
    if (lat >= PSH_TABLE[i].lat && lat <= PSH_TABLE[i + 1].lat) {
      lower = PSH_TABLE[i];
      upper = PSH_TABLE[i + 1];
      break;
    }
  }

  // Exact match or interpolation
  if (lower.lat === upper.lat || lat === lower.lat) {
    return [...lower.psh];
  }
  if (lat === upper.lat) {
    return [...upper.psh];
  }

  const t = (lat - lower.lat) / (upper.lat - lower.lat);
  return lower.psh.map((val, i) =>
    Math.round((val + t * (upper.psh[i] - val)) * 1000) / 1000
  );
}
