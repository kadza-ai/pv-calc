// Standard cable cross-sections in mm²
const STANDARD_SIZES = [4, 6, 10, 16, 25, 35];

// Copper resistivity: 0.0178 ohm·mm²/m
const COPPER_RESISTIVITY = 0.0178;

/**
 * Calculate cable voltage drop and recommend cable size.
 * @param {object} params
 * @param {number} params.systemVoltage - DC system voltage
 * @param {number} params.totalKwp      - total system kWp
 * @param {number} params.cableLength   - one-way cable length in meters
 * @param {number} params.maxDropPct    - max acceptable voltage drop %
 * @param {number|null} params.cableSize - override cable size in mm² (null = auto)
 * @returns {{ voltageDrop, voltageDropPct, recommendedSize, actualSize, warning }}
 */
export function calcCable({ systemVoltage, totalKwp, cableLength, maxDropPct, cableSize }) {
  if (systemVoltage <= 0 || totalKwp <= 0) {
    return { voltageDrop: 0, voltageDropPct: 0, recommendedSize: STANDARD_SIZES[0], actualSize: cableSize ?? STANDARD_SIZES[0], warning: null };
  }

  // Current at max power: I = P / V (in amps, kWp * 1000 / voltage)
  const current = (totalKwp * 1000) / systemVoltage;

  // Find recommended size: smallest standard cable where drop <= maxDropPct
  let recommendedSize = STANDARD_SIZES[STANDARD_SIZES.length - 1];
  for (const size of STANDARD_SIZES) {
    const drop = calcDrop(current, cableLength, size, systemVoltage);
    if (drop <= maxDropPct) {
      recommendedSize = size;
      break;
    }
  }

  const actualSize = cableSize ?? recommendedSize;
  const voltageDropPct = calcDrop(current, cableLength, actualSize, systemVoltage);
  const voltageDrop = (voltageDropPct / 100) * systemVoltage;
  const warning = voltageDropPct > maxDropPct
    ? `Voltage drop ${voltageDropPct.toFixed(2)}% exceeds max ${maxDropPct}%`
    : null;

  return { voltageDrop, voltageDropPct, recommendedSize, actualSize, warning };
}

function calcDrop(current, length, crossSection, voltage) {
  // V_drop = 2 * I * R, where R = resistivity * length / crossSection
  // Two conductors (+ and -), so factor of 2
  const resistance = (COPPER_RESISTIVITY * length) / crossSection;
  const vDrop = 2 * current * resistance;
  return (vDrop / voltage) * 100;
}
