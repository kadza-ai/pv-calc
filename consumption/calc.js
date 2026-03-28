const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Calculate monthly production, savings.
 * @param {object} params
 * @param {number[]} params.psh - 12 monthly Peak Sun Hours
 * @param {number} params.totalKwp - system size in kWp
 * @param {number} params.azimuthCorrectionFactor - azimuth correction (0-1)
 * @param {number} params.cableLossPct - cable loss percentage
 * @param {number[]} params.consumption - 12 monthly consumption in kWh
 * @param {number} params.electricityPrice - price per kWh in PLN
 * @param {number} params.lossFactor - system loss factor (e.g. 0.85)
 * @returns {{ production: number[], savings: number[], annualProduction: number, annualSavings: number }}
 */
export function calcConsumption({ psh, totalKwp, azimuthCorrectionFactor, cableLossPct, consumption, electricityPrice, lossFactor }) {
  const production = psh.map((h, i) =>
    h * totalKwp * lossFactor * azimuthCorrectionFactor * (1 - cableLossPct / 100) * DAYS_IN_MONTH[i]
  );

  const savings = production.map((prod, i) =>
    Math.min(prod, consumption[i]) * electricityPrice
  );

  const annualProduction = production.reduce((s, v) => s + v, 0);
  const annualSavings = savings.reduce((s, v) => s + v, 0);

  return { production, savings, annualProduction, annualSavings };
}
