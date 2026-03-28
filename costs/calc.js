/**
 * Calculate total cost and inflation-adjusted payback period.
 * @param {object} params
 * @param {{ name: string, unitPrice: number, quantity: number }[]} params.costItems
 * @param {number} params.annualSavings - annual savings in PLN (year 1)
 * @param {number} params.inflationRate - annual electricity price inflation in %
 * @returns {{ totalCost: number, paybackYears: number|null, itemizedCosts: {name: string, total: number}[] }}
 */
export function calcCosts({ costItems, annualSavings, inflationRate }) {
  const itemizedCosts = costItems.map(item => ({
    name: item.name,
    total: item.unitPrice * item.quantity,
  }));
  const totalCost = itemizedCosts.reduce((s, item) => s + item.total, 0);

  if (annualSavings <= 0 || totalCost <= 0) {
    return { totalCost, paybackYears: null, itemizedCosts };
  }

  const rate = inflationRate / 100;
  let cumulative = 0;
  let year = 0;
  const maxYears = 50;

  while (cumulative < totalCost && year < maxYears) {
    year++;
    const yearlySavings = annualSavings * Math.pow(1 + rate, year - 1);
    cumulative += yearlySavings;
  }

  return {
    totalCost,
    paybackYears: cumulative >= totalCost ? year : null,
    itemizedCosts,
  };
}
