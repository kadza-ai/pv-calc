import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calcConsumption } from "./calc.js";

describe("calcConsumption", () => {
  const defaults = {
    psh: [1.3, 2.0, 3.2, 4.4, 5.4, 5.8, 5.6, 4.8, 3.4, 2.2, 1.3, 1.0],
    totalKwp: 8,
    azimuthCorrectionFactor: 1.0,
    cableLossPct: 0.5,
    consumption: [300, 280, 260, 240, 220, 200, 200, 220, 240, 260, 280, 300],
    electricityPrice: 0.75,
    lossFactor: 0.85,
  };

  it("calculates monthly production from PSH, kWp, losses", () => {
    const result = calcConsumption(defaults);
    assert.equal(result.production.length, 12);
    const janExpected = 1.3 * 8 * 0.85 * 1.0 * (1 - 0.005) * 31;
    assert.ok(Math.abs(result.production[0] - janExpected) < 0.1);
  });

  it("savings = min(production, consumption) × price", () => {
    const result = calcConsumption(defaults);
    for (let i = 0; i < 12; i++) {
      const expected = Math.min(result.production[i], defaults.consumption[i]) * defaults.electricityPrice;
      assert.ok(Math.abs(result.savings[i] - expected) < 0.01,
        `Month ${i}: expected ${expected.toFixed(2)}, got ${result.savings[i].toFixed(2)}`);
    }
  });

  it("overproduction is not counted as income", () => {
    // Set consumption very low so production exceeds it every month
    const lowConsumption = Array(12).fill(10);
    const result = calcConsumption({ ...defaults, consumption: lowConsumption });
    for (let i = 0; i < 12; i++) {
      assert.ok(result.savings[i] <= 10 * defaults.electricityPrice + 0.01,
        `Month ${i}: savings should be capped at consumption`);
    }
  });

  it("zero production yields zero savings", () => {
    const result = calcConsumption({ ...defaults, totalKwp: 0 });
    assert.equal(result.annualProduction, 0);
    assert.equal(result.annualSavings, 0);
  });

  it("zero consumption yields zero savings", () => {
    const result = calcConsumption({ ...defaults, consumption: Array(12).fill(0) });
    assert.equal(result.annualSavings, 0);
    assert.ok(result.annualProduction > 0);
  });

  it("annual totals are sum of monthly values", () => {
    const result = calcConsumption(defaults);
    const prodSum = result.production.reduce((s, v) => s + v, 0);
    const savSum = result.savings.reduce((s, v) => s + v, 0);
    assert.ok(Math.abs(result.annualProduction - prodSum) < 0.01);
    assert.ok(Math.abs(result.annualSavings - savSum) < 0.01);
  });
});
