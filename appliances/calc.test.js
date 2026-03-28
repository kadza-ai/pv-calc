import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calcAppliances, generateSolarCurve } from "./calc.js";

describe("generateSolarCurve", () => {
  it("produces 24 hourly values with zero outside daylight", () => {
    // June at lat 51.66 — long days
    const curve = generateSolarCurve({ latitude: 51.66, month: 5, totalKwp: 8, azimuthCorrectionFactor: 1.0, cableLossPct: 0.5, lossFactor: 0.85, pshForMonth: 5.8 });
    assert.equal(curve.length, 24);
    // Night hours should be 0
    assert.equal(curve[0], 0);
    assert.equal(curve[23], 0);
    // Midday should be peak
    const peak = Math.max(...curve);
    const peakHour = curve.indexOf(peak);
    assert.ok(peakHour >= 11 && peakHour <= 13, `Peak should be around noon, got hour ${peakHour}`);
  });

  it("curve rises to midday and falls afterward", () => {
    const curve = generateSolarCurve({ latitude: 51.66, month: 5, totalKwp: 8, azimuthCorrectionFactor: 1.0, cableLossPct: 0.5, lossFactor: 0.85, pshForMonth: 5.8 });
    // Early morning < midday
    assert.ok(curve[6] < curve[12], "6am should be less than noon");
    // Late afternoon < midday
    assert.ok(curve[18] < curve[12], "6pm should be less than noon");
    // Curve has a bell shape: values increase toward peak then decrease
    const peak = Math.max(...curve);
    assert.ok(peak > 0, "Peak should be positive");
  });

  it("winter at high latitude produces very little", () => {
    // December at 60° — very short days
    const curve = generateSolarCurve({ latitude: 60, month: 11, totalKwp: 8, azimuthCorrectionFactor: 1.0, cableLossPct: 0, lossFactor: 0.85, pshForMonth: 0.3 });
    const total = curve.reduce((s, v) => s + v, 0);
    assert.ok(total < 5, `Winter at 60° should be very low, got ${total.toFixed(1)}`);
  });

  it("total daily energy matches PSH × kWp × losses", () => {
    const pshForMonth = 5.8;
    const curve = generateSolarCurve({ latitude: 51.66, month: 5, totalKwp: 8, azimuthCorrectionFactor: 1.0, cableLossPct: 0.5, lossFactor: 0.85, pshForMonth });
    const totalKwh = curve.reduce((s, v) => s + v, 0);
    const expected = pshForMonth * 8 * 0.85 * 1.0 * (1 - 0.005);
    assert.ok(Math.abs(totalKwh - expected) < 0.5,
      `Total ${totalKwh.toFixed(1)} should be near ${expected.toFixed(1)}`);
  });
});

describe("calcAppliances", () => {
  const baseParams = {
    latitude: 51.66,
    month: 5, // June
    totalKwp: 8,
    azimuthCorrectionFactor: 1.0,
    cableLossPct: 0.5,
    lossFactor: 0.85,
    pshForMonth: 5.8,
    baseLoad: 0.3,
  };

  const washer = { name: "Washing machine", power: 1.5, duration: 2, timesPerWeek: 3, contiguous: false, enabled: true, defaultHour: 18 };
  const dishwasher = { name: "Dishwasher", power: 1.8, duration: 2, timesPerWeek: 7, contiguous: true, enabled: true, defaultHour: 20 };

  it("optimized schedule has higher self-consumption than naive", () => {
    const result = calcAppliances({ ...baseParams, appliances: [washer, dishwasher] });
    assert.ok(result.optimized.selfConsumptionKwh >= result.naive.selfConsumptionKwh,
      `Optimized (${result.optimized.selfConsumptionKwh.toFixed(2)}) should be >= naive (${result.naive.selfConsumptionKwh.toFixed(2)})`);
  });

  it("contiguous appliance is scheduled in consecutive hours", () => {
    const result = calcAppliances({ ...baseParams, appliances: [dishwasher] });
    const sched = result.optimized.schedule[0];
    assert.equal(sched.hours.length, 2);
    assert.equal(sched.hours[1] - sched.hours[0], 1, "Hours should be consecutive");
  });

  it("splittable appliance can be in non-contiguous hours", () => {
    const result = calcAppliances({ ...baseParams, appliances: [washer] });
    const sched = result.optimized.schedule[0];
    assert.equal(sched.hours.length, 2);
    // Don't assert non-contiguous — greedy might pick contiguous if those are best
    // Just verify it scheduled the right number of hours
  });

  it("scheduling works even when solar is insufficient (soft target)", () => {
    // Winter month with very low production
    const result = calcAppliances({
      ...baseParams,
      pshForMonth: 0.3,
      month: 11,
      appliances: [washer],
    });
    // Should still produce a schedule, even if grid draw is high
    assert.equal(result.optimized.schedule.length, 1);
    assert.ok(result.optimized.gridDraw > 0, "Should need grid in winter");
  });

  it("disabled appliances are excluded from scheduling", () => {
    const disabled = { ...washer, enabled: false };
    const result = calcAppliances({ ...baseParams, appliances: [disabled] });
    assert.equal(result.optimized.schedule.length, 0);
  });
});
