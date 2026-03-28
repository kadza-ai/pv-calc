import { getPSH } from "./location/calc.js";
import { calcPanelFit } from "./terrain/calc.js";
import { calcPanels } from "./panels/calc.js";
import { calcCable } from "./cable/calc.js";
import { calcConsumption } from "./consumption/calc.js";
import { calcCosts } from "./costs/calc.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
  cableLength: 30,
  maxDropPct: 2,
  cableSize: null,
  electricityPrice: 0.75,
  lossFactor: 0.85,
  consumption: [300, 280, 260, 240, 220, 200, 200, 220, 240, 260, 280, 300],
  inflationRate: 3,
  costItems: [
    { name: "Panels", unitPrice: 800, quantity: 20, autoQty: true },
    { name: "Inverter", unitPrice: 5000, quantity: 1 },
    { name: "Mounting", unitPrice: 3000, quantity: 1 },
    { name: "Wiring", unitPrice: 1500, quantity: 1 },
    { name: "Grid-tie", unitPrice: 2000, quantity: 1 },
    { name: "Labor", unitPrice: 4000, quantity: 1 },
  ],
};

function recalc() {
  const psh = getPSH(state.latitude);
  renderPSH(psh);

  const auto = calcPanelFit(state);
  const cols = state.overrideCols ?? auto.cols;
  const rows = state.overrideRows ?? auto.rows;
  const totalPanels = cols * rows;
  renderTerrain({ auto, cols, rows, totalPanels });

  // Auto-sync panel quantity in cost items
  const panelCost = state.costItems.find(c => c.autoQty);
  if (panelCost) panelCost.quantity = totalPanels;

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

  const cableResult = calcCable({
    systemVoltage: panelResult.systemVoltage,
    totalKwp: panelResult.totalKwp,
    cableLength: state.cableLength,
    maxDropPct: state.maxDropPct,
    cableSize: state.cableSize,
  });
  renderCable(cableResult);

  const consumptionResult = calcConsumption({
    psh,
    totalKwp: panelResult.totalKwp,
    azimuthCorrectionFactor: panelResult.azimuthCorrectionFactor,
    cableLossPct: cableResult.voltageDropPct,
    consumption: state.consumption,
    electricityPrice: state.electricityPrice,
    lossFactor: state.lossFactor,
  });
  renderConsumption(consumptionResult);
  renderProductionChart(consumptionResult);

  const costsResult = calcCosts({
    costItems: state.costItems,
    annualSavings: consumptionResult.annualSavings,
    inflationRate: state.inflationRate,
  });
  renderCosts(costsResult);
}

function renderPSH(psh) {
  const el = document.getElementById("psh-output");
  el.innerHTML = MONTHS
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

function renderCable({ voltageDrop, voltageDropPct, recommendedSize, actualSize, warning }) {
  const el = document.getElementById("cable-output");
  el.innerHTML = `
    <div>Recommended: <strong>${recommendedSize} mm&sup2;</strong></div>
    <div>Active: ${actualSize} mm&sup2;</div>
    <div>Voltage drop: ${voltageDrop.toFixed(2)} V (${voltageDropPct.toFixed(2)}%)</div>
    ${warning ? `<div style="color: #c00; font-weight: 600;">&#9888; ${warning}</div>` : ""}
  `;
}

function renderConsumption({ production, savings, annualProduction, annualSavings }) {
  const el = document.getElementById("consumption-output");
  el.innerHTML = `
    <div>Annual production: <strong>${annualProduction.toFixed(0)} kWh</strong></div>
    <div>Annual savings: <strong>${annualSavings.toFixed(2)} z\u0142</strong></div>
    <table style="width:100%; font-size:0.8rem; margin-top:0.5rem;">
      <tr><th>Month</th><th>Prod (kWh)</th><th>Cons (kWh)</th><th>Savings (z\u0142)</th></tr>
      ${MONTHS.map((m, i) => `<tr><td>${m}</td><td>${production[i].toFixed(0)}</td><td>${state.consumption[i]}</td><td>${savings[i].toFixed(2)}</td></tr>`).join("")}
    </table>
  `;
}

function renderProductionChart({ production }) {
  const canvas = document.getElementById("production-chart");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const maxVal = Math.max(...production, ...state.consumption, 1);
  const barW = (W - 60) / 12;
  const chartH = H - 40;

  ctx.fillStyle = "#e0e0e0";
  ctx.fillRect(50, 10, W - 60, chartH);

  for (let i = 0; i < 12; i++) {
    const x = 50 + i * barW;
    const prodH = (production[i] / maxVal) * chartH;
    const consH = (state.consumption[i] / maxVal) * chartH;
    const bw = barW * 0.4;

    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(x + 2, 10 + chartH - prodH, bw, prodH);
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(x + 2 + bw, 10 + chartH - consH, bw, consH);

    ctx.fillStyle = "#333";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(MONTHS[i], x + barW / 2, H - 5);
  }

  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(55, 2, 8, 8);
  ctx.fillStyle = "#3b82f6";
  ctx.fillRect(105, 2, 8, 8);
  ctx.fillStyle = "#333";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Production", 66, 10);
  ctx.fillText("Consumption", 116, 10);
}

function renderCosts({ totalCost, paybackYears, itemizedCosts }) {
  const el = document.getElementById("costs-output");
  el.innerHTML = `
    <table style="width:100%; font-size:0.85rem;">
      <tr><th>Item</th><th style="text-align:right;">Total (z\u0142)</th></tr>
      ${itemizedCosts.map(c => `<tr><td>${c.name}</td><td style="text-align:right;">${c.total.toLocaleString()}</td></tr>`).join("")}
      <tr style="font-weight:700; border-top:2px solid #333;"><td>Total</td><td style="text-align:right;">${totalCost.toLocaleString()} z\u0142</td></tr>
    </table>
    <div style="margin-top:0.5rem;">Payback: <strong>${paybackYears !== null ? paybackYears + " years" : "N/A"}</strong></div>
  `;
}

function buildConsumptionInputs() {
  const container = document.getElementById("monthly-consumption-inputs");
  container.innerHTML = `<label style="margin-top:0.5rem; display:block;">Monthly consumption (kWh)</label>` +
    MONTHS.map((m, i) => `
      <div style="display:flex; gap:0.3rem; align-items:center; margin:2px 0;">
        <span style="width:2rem; font-size:0.8rem;">${m}</span>
        <input type="number" class="monthly-cons" data-month="${i}" value="${state.consumption[i]}" step="10" min="0" style="flex:1;">
      </div>
    `).join("");

  container.querySelectorAll(".monthly-cons").forEach(input => {
    input.addEventListener("input", (e) => {
      state.consumption[parseInt(e.target.dataset.month)] = parseFloat(e.target.value) || 0;
      recalc();
    });
  });
}

function buildCostInputs() {
  const container = document.getElementById("cost-items-container");
  container.innerHTML = state.costItems.map((item, i) => `
    <div style="display:flex; gap:0.3rem; align-items:center; margin:4px 0; font-size:0.8rem;">
      <input type="text" value="${item.name}" data-idx="${i}" data-field="name" class="cost-field" style="flex:2;">
      <input type="number" value="${item.unitPrice}" data-idx="${i}" data-field="unitPrice" class="cost-field" style="flex:1;" step="100">
      <span>&times;</span>
      <input type="number" value="${item.quantity}" data-idx="${i}" data-field="quantity" class="cost-field" style="width:3rem;" step="1" ${item.autoQty ? 'disabled title="Auto from layout"' : ""}>
      ${!item.autoQty ? `<button type="button" class="remove-cost" data-idx="${i}" style="cursor:pointer;">&times;</button>` : ""}
    </div>
  `).join("");

  container.querySelectorAll(".cost-field").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx);
      const field = e.target.dataset.field;
      state.costItems[idx][field] = field === "name" ? e.target.value : parseFloat(e.target.value) || 0;
      recalc();
    });
  });

  container.querySelectorAll(".remove-cost").forEach(btn => {
    btn.addEventListener("click", (e) => {
      state.costItems.splice(parseInt(e.target.dataset.idx), 1);
      buildCostInputs();
      recalc();
    });
  });
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
bindInput("cable-length", "cableLength");
bindInput("max-drop-pct", "maxDropPct");
bindOptionalInput("cable-size", "cableSize");
bindInput("electricity-price", "electricityPrice");
bindInput("loss-factor", "lossFactor");
bindInput("inflation-rate", "inflationRate");

document.getElementById("add-cost-item").addEventListener("click", () => {
  state.costItems.push({ name: "Custom", unitPrice: 0, quantity: 1 });
  buildCostInputs();
  recalc();
});

buildConsumptionInputs();
buildCostInputs();
recalc();
