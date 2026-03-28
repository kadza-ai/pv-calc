/**
 * Calculate how many panels fit on the terrain.
 * @param {object} params
 * @param {number} params.terrainWidth  - terrain width in meters
 * @param {number} params.terrainHeight - terrain height in meters
 * @param {number} params.panelWidth    - single panel width in meters (portrait)
 * @param {number} params.panelHeight   - single panel height in meters (portrait)
 * @returns {{ cols: number, rows: number, totalPanels: number }}
 */
export function calcPanelFit({ terrainWidth, terrainHeight, panelWidth, panelHeight }) {
  const cols = Math.floor(terrainWidth / panelWidth);
  const rows = Math.floor(terrainHeight / panelHeight);
  return { cols, rows, totalPanels: cols * rows };
}
