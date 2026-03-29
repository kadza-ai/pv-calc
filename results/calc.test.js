import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calcWarnings } from "./calc.js";

describe("calcWarnings", () => {
  const safe = {
    latitude: 51.66,
    totalPanels: 20,
    annualProduction: 8000,
    annualConsumption: 3000,
    voltageDropPct: 1.5,
    maxDropPct: 2,
    systemVoltage: 750,
    maxVoltage: 800,
    totalKwp: 8,
    inverterKw: 8,
    production: [200, 300, 500, 700, 900, 1000, 950, 800, 600, 400, 200, 150],
  };

  it("no warnings for safe defaults", () => {
    const warnings = calcWarnings(safe);
    assert.equal(warnings.length, 0);
  });

  it("warns when latitude > 66.5", () => {
    const warnings = calcWarnings({ ...safe, latitude: 67 });
    assert.ok(warnings.some(w => w.includes("latitude")));
  });

  it("warns when terrain too small (0 panels)", () => {
    const warnings = calcWarnings({ ...safe, totalPanels: 0 });
    assert.ok(warnings.some(w => w.includes("panel")));
  });

  it("warns when production < consumption", () => {
    const warnings = calcWarnings({ ...safe, annualProduction: 2000, annualConsumption: 3000 });
    assert.ok(warnings.some(w => w.includes("consumption") || w.includes("coverage")));
  });

  it("warns when voltage drop exceeds max", () => {
    const warnings = calcWarnings({ ...safe, voltageDropPct: 3.5, maxDropPct: 2 });
    assert.ok(warnings.some(w => w.includes("voltage drop")));
  });

  it("warns when string voltage exceeds max", () => {
    const warnings = calcWarnings({ ...safe, systemVoltage: 850, maxVoltage: 800 });
    assert.ok(warnings.some(w => w.includes("voltage") && w.includes("800")));
  });

  it("warns when inverter may be undersized", () => {
    const warnings = calcWarnings({ ...safe, totalKwp: 10, inverterKw: 7 });
    assert.ok(warnings.some(w => w.toLowerCase().includes("inverter")));
  });

  it("warns when any month has zero production", () => {
    const prod = [...safe.production];
    prod[11] = 0;
    const warnings = calcWarnings({ ...safe, production: prod });
    assert.ok(warnings.some(w => w.includes("zero production")));
  });
});
