import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calcCable } from "./calc.js";

describe("calcCable", () => {
  const defaults = {
    systemVoltage: 750,
    totalKwp: 8,
    cableLength: 30,
    maxDropPct: 2,
    cableSize: null,
  };

  it("calculates voltage drop for a known scenario", () => {
    const result = calcCable(defaults);
    assert.ok(result.voltageDropPct > 0);
    assert.ok(result.voltageDrop > 0);
    // Verify math: I = 8000/750 ≈ 10.67A
    // For recommended cable, drop should be <= 2%
    assert.ok(result.voltageDropPct <= 2);
  });

  it("recommends smallest cable that keeps drop under threshold", () => {
    const result = calcCable(defaults);
    assert.ok([4, 6, 10, 16, 25, 35].includes(result.recommendedSize));
    assert.ok(result.voltageDropPct <= defaults.maxDropPct);
  });

  it("uses override cable size when provided", () => {
    const result = calcCable({ ...defaults, cableSize: 35 });
    assert.equal(result.actualSize, 35);
    // Larger cable = less drop than recommended
    const autoResult = calcCable(defaults);
    assert.ok(result.voltageDropPct <= autoResult.voltageDropPct);
  });

  it("warns when voltage drop exceeds max threshold", () => {
    // Use tiny cable with long distance to force high drop
    const result = calcCable({ ...defaults, cableSize: 4, cableLength: 200 });
    assert.ok(result.voltageDropPct > 2);
    assert.ok(result.warning !== null);
    assert.ok(result.warning.includes("exceeds"));
  });

  it("no warning when drop is within threshold", () => {
    const result = calcCable(defaults);
    assert.equal(result.warning, null);
  });

  it("larger cable reduces voltage drop", () => {
    const small = calcCable({ ...defaults, cableSize: 4 });
    const large = calcCable({ ...defaults, cableSize: 35 });
    assert.ok(large.voltageDropPct < small.voltageDropPct);
  });

  it("longer distance increases voltage drop", () => {
    const short = calcCable({ ...defaults, cableSize: 10, cableLength: 10 });
    const long = calcCable({ ...defaults, cableSize: 10, cableLength: 100 });
    assert.ok(long.voltageDropPct > short.voltageDropPct);
  });

  it("returns zero drop with zero kWp", () => {
    const result = calcCable({ ...defaults, totalKwp: 0 });
    assert.equal(result.voltageDropPct, 0);
    assert.equal(result.voltageDrop, 0);
  });
});
