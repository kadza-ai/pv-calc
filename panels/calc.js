/**
 * Calculate panel string configuration and production parameters.
 * @param {object} params
 * @param {number} params.totalPanels - total number of panels
 * @param {number} params.panelWp    - watt-peak per panel
 * @param {number} params.maxVoltage - max inverter input voltage (DC)
 * @param {number} params.panelVoc   - open-circuit voltage per panel
 * @param {number} params.latitude   - site latitude in degrees
 * @param {number} params.azimuth    - panel azimuth in degrees (180 = due south)
 * @param {number} params.dcAcRatio  - DC/AC ratio for inverter sizing
 * @returns {{ series, parallel, systemVoltage, totalKwp, tiltAngle, azimuthCorrectionFactor, inverterKw }}
 */
export function calcPanels({ totalPanels, panelWp, maxVoltage, panelVoc, latitude, azimuth, dcAcRatio }) {
  if (totalPanels <= 0) {
    return { series: 0, parallel: 0, systemVoltage: 0, totalKwp: 0, tiltAngle: 0, azimuthCorrectionFactor: 0, inverterKw: 0 };
  }

  const maxSeries = Math.floor(maxVoltage / panelVoc);
  // Find largest series count that divides evenly, or closest fit
  let series = Math.min(maxSeries, totalPanels);
  let parallel = 1;

  // Try to find a series count that uses all panels evenly
  for (let s = series; s >= 1; s--) {
    if (totalPanels % s === 0) {
      series = s;
      parallel = totalPanels / s;
      break;
    }
  }

  const systemVoltage = series * panelVoc;
  const totalKwp = (totalPanels * panelWp) / 1000;
  const tiltAngle = latitude;
  const azimuthOffset = Math.abs(azimuth - 180);
  const azimuthCorrectionFactor = Math.cos((azimuthOffset * Math.PI) / 180);
  const inverterKw = totalKwp / dcAcRatio;

  return { series, parallel, systemVoltage, totalKwp, tiltAngle, azimuthCorrectionFactor, inverterKw };
}
