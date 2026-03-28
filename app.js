import { getPSH } from "./location/calc.js";
import { calcPanelFit } from "./terrain/calc.js";
import { calcPanels } from "./panels/calc.js";

const state = {
  latitude: 51.66,
  terrainWidth: 12,
  terrainHeight: 5,
  panelWidth: 1.1,
  panelHeight: 1.7,
  overrideCols: null,
  overrideRows: null,
  panelWp: 400,
  panelVoc: 37.5,
  maxVoltage: 800,
  overrideTilt: null,
  azimuth: 180,
  dcAcRatio: 1.0,
};

function recalc() {
  const psh = getPSH(state.latitude);
  renderPSH(psh);

  const auto = calcPanelFit(state);
  const cols = state.overrideCols ?? auto.cols;
  const rows = state.overrideRows ?? auto.rows;
  const totalPanels = cols * rows;
  renderTerrain({ auto, cols, rows, totalPanels });

  const panelResult = calcPanels({
    totalPanels,
    panelWp: state.panelWp,
    maxVoltage: state.maxVoltage,
    panelVoc: state.panelVoc,
    latitude: state.latitude,
    azimuth: state.azimuth,
    dcAcRatio: state.dcAcRatio,
  });
  const tiltAngle = state.overrideTilt ?? panelResult.tiltAngle;
  renderPanels({ ...panelResult, tiltAngle });
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

function renderPanels({ series, parallel, systemVoltage, totalKwp, tiltAngle, azimuthCorrectionFactor, inverterKw }) {
  const el = document.getElementById("panels-output");
  el.innerHTML = `
    <div>Strings: ${series}S &times; ${parallel}P</div>
    <div>System voltage: <strong>${systemVoltage.toFixed(1)} V DC</strong></div>
    <div>Total: <strong>${totalKwp.toFixed(2)} kWp</strong></div>
    <div>Tilt: ${tiltAngle.toFixed(1)}&deg;</div>
    <div>Azimuth correction: ${azimuthCorrectionFactor.toFixed(3)}</div>
    <div>Inverter: ${inverterKw.toFixed(2)} kW</div>
  `;
}

function bindInput(id, key, parser = parseFloat) {
  document.getElementById(id).addEventListener("input", (e) => {
    state[key] = parser(e.target.value);
    recalc();
  });
}

function bindOptionalInput(id, key, parser = parseInt) {
  document.getElementById(id).addEventListener("input", (e) => {
    const val = e.target.value.trim();
    state[key] = val === "" ? null : parser(val, 10);
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
bindInput("panel-wp", "panelWp");
bindInput("panel-voc", "panelVoc");
bindInput("max-voltage", "maxVoltage");
bindOptionalInput("tilt-angle", "overrideTilt", parseFloat);
bindInput("azimuth", "azimuth");
bindInput("dc-ac-ratio", "dcAcRatio");

recalc();
