import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calcPanels } from "./calc.js";

describe("calcPanels", () => {
  const defaults = {
    totalPanels: 20,
    panelWp: 400,
    maxVoltage: 800,
    panelVoc: 37.5,
    latitude: 51.66,
    azimuth: 180,
    dcAcRatio: 1.0,
  };

  it("calculates series/parallel to maximize series within voltage limit", () => {
    const result = calcPanels(defaults);
    assert.equal(result.series, 20);
    assert.equal(result.parallel, 1);
    assert.equal(result.systemVoltage, 750);
  });

  it("splits into parallel strings when panels exceed voltage limit", () => {
    // 30 panels, max series = floor(800/37.5) = 21
    // 30 panels: try 21 (30%21!=0), 15 (30%15=0) → series=15, parallel=2
    const result = calcPanels({ ...defaults, totalPanels: 30 });
    assert.equal(result.series, 15);
    assert.equal(result.parallel, 2);
    assert.ok(result.systemVoltage <= 800);
  });

  it("calculates total kWp from panel count and wattage", () => {
    const result = calcPanels(defaults);
    assert.equal(result.totalKwp, 8); // 20 * 400 / 1000
  });

  it("defaults tilt angle to latitude", () => {
    const result = calcPanels(defaults);
    assert.equal(result.tiltAngle, 51.66);
  });

  it("applies cosine azimuth correction for due south (180°)", () => {
    const result = calcPanels({ ...defaults, azimuth: 180 });
    assert.ok(Math.abs(result.azimuthCorrectionFactor - 1.0) < 0.001);
  });

  it("applies cosine azimuth correction for non-south orientation", () => {
    // 150° = 30° offset from south → cos(30°) ≈ 0.866
    const result = calcPanels({ ...defaults, azimuth: 150 });
    assert.ok(Math.abs(result.azimuthCorrectionFactor - 0.866) < 0.01,
      `Expected ~0.866, got ${result.azimuthCorrectionFactor}`);
  });

  it("calculates inverter size from kWp and DC/AC ratio", () => {
    const result = calcPanels({ ...defaults, dcAcRatio: 1.2 });
    // 8 kWp / 1.2 ≈ 6.667 kW
    assert.ok(Math.abs(result.inverterKw - 6.667) < 0.01);
  });

  it("returns zeros when no panels", () => {
    const result = calcPanels({ ...defaults, totalPanels: 0 });
    assert.equal(result.series, 0);
    assert.equal(result.parallel, 0);
    assert.equal(result.totalKwp, 0);
  });
});
