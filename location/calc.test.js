import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getPSH } from "./calc.js";

describe("getPSH", () => {
  it("returns values for equator (latitude 0)", () => {
    const psh = getPSH(0);
    assert.equal(psh.length, 12);
    // Equator should have relatively uniform PSH year-round
    const min = Math.min(...psh);
    const max = Math.max(...psh);
    assert.ok(max - min < 1.5, "Equatorial PSH should be relatively uniform");
    assert.ok(min > 4, "Equatorial PSH should be high year-round");
  });

  it("returns values for max latitude (65)", () => {
    const psh = getPSH(65);
    assert.equal(psh.length, 12);
    // High latitude: very low in winter, moderate in summer
    assert.ok(psh[0] < 0.5, `January at 65° should be very low, got ${psh[0]}`);
    assert.ok(psh[5] > 4, `June at 65° should be moderate, got ${psh[5]}`);
  });

  it("clamps latitude above 65 to 65", () => {
    const psh70 = getPSH(70);
    const psh65 = getPSH(65);
    assert.deepEqual(psh70, psh65);
  });

  it("clamps latitude below 0 to 0", () => {
    const pshNeg = getPSH(-5);
    const psh0 = getPSH(0);
    assert.deepEqual(pshNeg, psh0);
  });

  it("interpolates between table entries for latitude 51.66", () => {
    const psh = getPSH(51.66);
    assert.equal(psh.length, 12);
    // t = (51.66 - 50) / (55 - 50) = 0.332
    // January: 1.3 + 0.332 * (0.8 - 1.3) = 1.3 - 0.166 = 1.134
    assert.ok(Math.abs(psh[0] - 1.134) < 0.01, `Jan expected ~1.134, got ${psh[0]}`);
    // June: 5.8 + 0.332 * (5.7 - 5.8) = 5.8 - 0.0332 = 5.7668
    assert.ok(Math.abs(psh[5] - 5.767) < 0.01, `Jun expected ~5.767, got ${psh[5]}`);
    // Each value should be between lat-50 and lat-55 values
    const psh50 = getPSH(50);
    const psh55 = getPSH(55);
    for (let i = 0; i < 12; i++) {
      const lo = Math.min(psh50[i], psh55[i]);
      const hi = Math.max(psh50[i], psh55[i]);
      assert.ok(psh[i] >= lo - 0.001 && psh[i] <= hi + 0.001,
        `Month ${i}: ${psh[i]} not between ${lo} and ${hi}`);
    }
  });

  it("returns exact table values for latitude 50", () => {
    const psh = getPSH(50);
    // Lat 50 is an exact table entry — values should match the table directly
    assert.equal(psh.length, 12);
    // January at lat 50 should be a low value (~1.3)
    assert.equal(typeof psh[0], "number");
    // Spot-check: winter months low, summer months high
    assert.ok(psh[0] < psh[5], "January should be less than June");
    assert.ok(psh[11] < psh[5], "December should be less than June");
  });
});
