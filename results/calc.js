const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Generate advisory warnings based on cross-module state.
 * All warnings are advisory — results are still shown.
 * @returns {string[]}
 */
export function calcWarnings({ latitude, totalPanels, annualProduction, annualConsumption, voltageDropPct, maxDropPct, systemVoltage, maxVoltage, totalKwp, inverterKw, production }) {
  const warnings = [];

  if (latitude > 66.5) {
    warnings.push(`Extreme latitude (${latitude.toFixed(1)}\u00b0) \u2014 solar production will be very low.`);
  }

  if (totalPanels === 0) {
    warnings.push("Terrain too small for any panel \u2014 no panels fit with current dimensions.");
  }

  if (annualProduction < annualConsumption && totalPanels > 0) {
    const pct = ((annualProduction / annualConsumption) * 100).toFixed(0);
    warnings.push(`System covers only ${pct}% of annual consumption \u2014 insufficient coverage.`);
  }

  if (voltageDropPct > maxDropPct) {
    warnings.push(`Cable voltage drop (${voltageDropPct.toFixed(2)}%) exceeds max ${maxDropPct}% \u2014 consider larger cable.`);
  }

  if (systemVoltage > maxVoltage) {
    warnings.push(`String voltage (${systemVoltage.toFixed(0)}V) exceeds inverter max ${maxVoltage}V DC \u2014 reduce panels per string.`);
  }

  if (totalKwp > 0 && inverterKw < totalKwp * 0.8) {
    warnings.push(`Inverter (${inverterKw.toFixed(1)}kW) may be undersized for ${totalKwp.toFixed(1)}kWp system.`);
  }

  const zeroMonths = production
    .map((p, i) => p === 0 ? MONTHS[i] : null)
    .filter(Boolean);
  if (zeroMonths.length > 0) {
    warnings.push(`Zero production in ${zeroMonths.join(", ")} \u2014 zero production months detected.`);
  }

  return warnings;
}
