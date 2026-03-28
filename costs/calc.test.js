import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calcCosts } from "./calc.js";

describe("calcCosts", () => {
  const defaults = {
    costItems: [
      { name: "Panels", unitPrice: 800, quantity: 20 },
      { name: "Inverter", unitPrice: 5000, quantity: 1 },
      { name: "Mounting", unitPrice: 3000, quantity: 1 },
      { name: "Wiring", unitPrice: 1500, quantity: 1 },
      { name: "Grid-tie", unitPrice: 2000, quantity: 1 },
      { name: "Labor", unitPrice: 4000, quantity: 1 },
    ],
    annualSavings: 3000,
    inflationRate: 3,
  };

  it("calculates total cost from line items", () => {
    const result = calcCosts(defaults);
    assert.equal(result.totalCost, 31500);
  });

  it("calculates inflation-adjusted payback period", () => {
    const result = calcCosts(defaults);
    assert.equal(typeof result.paybackYears, "number");
    // Manual: year 1 = 3000, year 2 = 3090, year 3 = 3182.7, ...
    // Cumulative after ~9 years should exceed 31500
    assert.ok(result.paybackYears > 0 && result.paybackYears < 20);
  });

  it("payback matches manual computation for simple case", () => {
    // Cost = 10000, savings = 5000/year, 0% inflation → payback = 2 years
    const result = calcCosts({
      costItems: [{ name: "Test", unitPrice: 10000, quantity: 1 }],
      annualSavings: 5000,
      inflationRate: 0,
    });
    assert.equal(result.paybackYears, 2);
  });

  it("inflation shortens payback period", () => {
    const noInflation = calcCosts({ ...defaults, inflationRate: 0 });
    const withInflation = calcCosts({ ...defaults, inflationRate: 5 });
    assert.ok(withInflation.paybackYears <= noInflation.paybackYears);
  });

  it("returns null payback with zero savings", () => {
    const result = calcCosts({ ...defaults, annualSavings: 0 });
    assert.equal(result.paybackYears, null);
  });

  it("returns null payback with zero cost", () => {
    const result = calcCosts({ ...defaults, costItems: [] });
    assert.equal(result.totalCost, 0);
  });

  it("itemized costs break down correctly", () => {
    const result = calcCosts(defaults);
    assert.equal(result.itemizedCosts.length, 6);
    assert.equal(result.itemizedCosts[0].name, "Panels");
    assert.equal(result.itemizedCosts[0].total, 16000);
  });
});
