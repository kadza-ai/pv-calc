import { getPSH } from "./location/calc.js";
import { calcPanelFit } from "./terrain/calc.js";

const state = {
  latitude: 51.66,
  terrainWidth: 12,
  terrainHeight: 5,
  panelWidth: 1.1,
  panelHeight: 1.7,
  overrideCols: null,
  overrideRows: null,
};

function recalc() {
  const psh = getPSH(state.latitude);
  renderPSH(psh);

  const auto = calcPanelFit(state);
  const cols = state.overrideCols ?? auto.cols;
  const rows = state.overrideRows ?? auto.rows;
  const totalPanels = cols * rows;
  renderTerrain({ auto, cols, rows, totalPanels });
}

function renderPSH(psh) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const el = document.getElementById("psh-output");
  el.innerHTML = months
    .map((m, i) => `<div>${m}: <strong>${psh[i].toFixed(2)}</strong> h</div>`)
    .join("");
}

function renderTerrain({ auto, cols, rows, totalPanels }) {
  const el = document.getElementById("terrain-output");
  el.innerHTML = `
    <div>Auto-calculated: ${auto.cols} cols &times; ${auto.rows} rows = ${auto.totalPanels} panels</div>
    <div><strong>Active: ${cols} cols &times; ${rows} rows = ${totalPanels} panels</strong></div>
  `;
}

function bindInput(id, key, parser = parseFloat) {
  document.getElementById(id).addEventListener("input", (e) => {
    state[key] = parser(e.target.value);
    recalc();
  });
}

function bindOptionalInput(id, key) {
  document.getElementById(id).addEventListener("input", (e) => {
    const val = e.target.value.trim();
    state[key] = val === "" ? null : parseInt(val, 10);
    recalc();
  });
}

bindInput("latitude", "latitude");
bindInput("terrain-width", "terrainWidth");
bindInput("terrain-height", "terrainHeight");
bindInput("panel-width", "panelWidth");
bindInput("panel-height", "panelHeight");
bindOptionalInput("override-cols", "overrideCols");
bindOptionalInput("override-rows", "overrideRows");

recalc();
