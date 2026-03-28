import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calcPanelFit } from "./calc.js";

describe("calcPanelFit", () => {
  it("calculates correct rows and columns for a typical terrain", () => {
    const result = calcPanelFit({ terrainWidth: 12, terrainHeight: 5, panelWidth: 1.1, panelHeight: 1.7 });
    assert.equal(result.cols, 10);  // floor(12 / 1.1) = 10
    assert.equal(result.rows, 2);   // floor(5 / 1.7) = 2
    assert.equal(result.totalPanels, 20);
  });

  it("returns 0 panels when terrain is smaller than one panel", () => {
    const result = calcPanelFit({ terrainWidth: 0.5, terrainHeight: 0.5, panelWidth: 1.1, panelHeight: 1.7 });
    assert.equal(result.cols, 0);
    assert.equal(result.rows, 0);
    assert.equal(result.totalPanels, 0);
  });

  it("returns 0 panels when only width is too small", () => {
    const result = calcPanelFit({ terrainWidth: 0.5, terrainHeight: 5, panelWidth: 1.1, panelHeight: 1.7 });
    assert.equal(result.cols, 0);
    assert.equal(result.totalPanels, 0);
  });

  it("handles exact fit with no remainder", () => {
    // 2.2m = exactly 2 panels wide, 3.4m = exactly 2 panels tall
    const result = calcPanelFit({ terrainWidth: 2.2, terrainHeight: 3.4, panelWidth: 1.1, panelHeight: 1.7 });
    assert.equal(result.cols, 2);
    assert.equal(result.rows, 2);
    assert.equal(result.totalPanels, 4);
  });

  it("floors fractional fits correctly", () => {
    // 2.19m is just under 2 panels wide (2 * 1.1 = 2.2)
    const result = calcPanelFit({ terrainWidth: 2.19, terrainHeight: 1.7, panelWidth: 1.1, panelHeight: 1.7 });
    assert.equal(result.cols, 1);
    assert.equal(result.rows, 1);
    assert.equal(result.totalPanels, 1);
  });
});
