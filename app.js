import { getPSH } from "./location/calc.js";
import { calcPanelFit } from "./terrain/calc.js";
import { calcPanels } from "./panels/calc.js";
import { calcCable } from "./cable/calc.js";
import { calcConsumption } from "./consumption/calc.js";
import { calcCosts } from "./costs/calc.js";
import { calcAppliances } from "./appliances/calc.js";
import { calcWarnings } from "./results/calc.js";

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
  baseLoad: 0.3,
  appliances: [
    { name: "Dishwasher", power: 1.8, duration: 2, timesPerWeek: 7, contiguous: true, enabled: true, defaultHour: 20 },
    { name: "Washing machine", power: 1.5, duration: 2, timesPerWeek: 3, contiguous: false, enabled: true, defaultHour: 18 },
    { name: "Tumble dryer", power: 2.5, duration: 1.5, timesPerWeek: 3, contiguous: false, enabled: true, defaultHour: 19 },
    { name: "EV charger", power: 7.4, duration: 3, timesPerWeek: 3, contiguous: false, enabled: false, defaultHour: 22 },
    { name: "Oven", power: 2.0, duration: 1, timesPerWeek: 5, contiguous: true, enabled: true, defaultHour: 17 },
  ],
  selectedMonth: 5,
};

function recalc() {
  const psh = getPSH(state.latitude);
  renderPSH(psh);

  const auto = calcPanelFit(state);
  const cols = state.overrideCols ?? auto.cols;
  const rows = state.overrideRows ?? auto.rows;
  const totalPanels = cols * rows;
  renderTerrain({ auto, cols, rows, totalPanels });

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

  const applianceResult = calcAppliances({
    latitude: state.latitude,
    month: state.selectedMonth,
    totalKwp: panelResult.totalKwp,
    azimuthCorrectionFactor: panelResult.azimuthCorrectionFactor,
    cableLossPct: cableResult.voltageDropPct,
    lossFactor: state.lossFactor,
    pshForMonth: psh[state.selectedMonth],
    baseLoad: state.baseLoad,
    appliances: state.appliances,
  });
  renderAppliances(applianceResult);
  renderScheduleChart(applianceResult);

  // Per-month summary
  const monthlySummary = psh.map((_, m) => {
    const mr = calcAppliances({
      latitude: state.latitude,
      month: m,
      totalKwp: panelResult.totalKwp,
      azimuthCorrectionFactor: panelResult.azimuthCorrectionFactor,
      cableLossPct: cableResult.voltageDropPct,
      lossFactor: state.lossFactor,
      pshForMonth: psh[m],
      baseLoad: state.baseLoad,
      appliances: state.appliances,
    });
    return {
      selfKwh: mr.optimized.selfConsumptionKwh,
      selfPct: mr.optimized.selfConsumptionPct,
      savingsZl: mr.optimized.selfConsumptionKwh * state.electricityPrice,
    };
  });
  renderMonthlySelfConsumption(monthlySummary);

  const warnings = calcWarnings({
    latitude: state.latitude,
    totalPanels,
    annualProduction: consumptionResult.annualProduction,
    annualConsumption: state.consumption.reduce((s, v) => s + v, 0),
    voltageDropPct: cableResult.voltageDropPct,
    maxDropPct: state.maxDropPct,
    systemVoltage: panelResult.systemVoltage,
    maxVoltage: state.maxVoltage,
    totalKwp: panelResult.totalKwp,
    inverterKw: panelResult.inverterKw,
    production: consumptionResult.production,
  });
  renderWarnings(warnings);

  renderTopDown({
    terrainWidth: state.terrainWidth,
    terrainHeight: state.terrainHeight,
    cols, rows,
    panelWidth: state.panelWidth,
    panelHeight: state.panelHeight,
    cableLength: state.cableLength,
  });
  renderSideCrossSection({
    tiltAngle,
    panelHeight: state.panelHeight,
  });
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

function renderAppliances({ optimized, naive }) {
  const el = document.getElementById("appliances-output");
  const delta = optimized.selfConsumptionKwh - naive.selfConsumptionKwh;
  el.innerHTML = `
    <div>
      <label for="schedule-month">Month:</label>
      <select id="schedule-month">
        ${MONTHS.map((m, i) => `<option value="${i}" ${i === state.selectedMonth ? "selected" : ""}>${m}</option>`).join("")}
      </select>
    </div>
    <table style="width:100%; font-size:0.8rem; margin-top:0.5rem;">
      <tr><th></th><th>Naive</th><th>Optimized</th></tr>
      <tr><td>Self-consumption</td><td>${naive.selfConsumptionKwh.toFixed(2)} kWh</td><td>${optimized.selfConsumptionKwh.toFixed(2)} kWh</td></tr>
      <tr><td>Self-consumption %</td><td>${naive.selfConsumptionPct.toFixed(1)}%</td><td>${optimized.selfConsumptionPct.toFixed(1)}%</td></tr>
      <tr><td>Grid draw</td><td>${naive.gridDraw.toFixed(2)} kWh</td><td>${optimized.gridDraw.toFixed(2)} kWh</td></tr>
    </table>
    <div style="margin-top:0.3rem; font-weight:600;">Delta: +${delta.toFixed(2)} kWh self-consumed with optimized schedule</div>
    <div style="margin-top:0.5rem; font-size:0.8rem;">
      <strong>Optimized schedule:</strong>
      ${optimized.schedule.map(s => `<div>${s.name}: hours ${s.hours.join(", ")} (${s.kwhUsed.toFixed(2)}/${s.totalKwh.toFixed(2)} kWh solar)</div>`).join("")}
    </div>
  `;

  document.getElementById("schedule-month").addEventListener("change", (e) => {
    state.selectedMonth = parseInt(e.target.value);
    recalc();
  });
}

const APPLIANCE_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#f97316", "#06b6d4", "#ec4899", "#84cc16"];

function renderScheduleChart({ solarCurve, optimized }) {
  const canvas = document.getElementById("schedule-chart");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const maxKw = Math.max(...solarCurve, 1);
  const chartL = 40, chartR = W - 10, chartT = 25, chartB = H - 25;
  const chartW = chartR - chartL, chartH = chartB - chartT;
  const barW = chartW / 24;

  // Background
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(chartL, chartT, chartW, chartH);

  // Solar curve as filled area
  ctx.beginPath();
  ctx.moveTo(chartL, chartB);
  for (let h = 0; h < 24; h++) {
    const x = chartL + h * barW + barW / 2;
    const y = chartB - (solarCurve[h] / maxKw) * chartH;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(chartL + 24 * barW, chartB);
  ctx.closePath();
  ctx.fillStyle = "rgba(250, 204, 21, 0.3)";
  ctx.fill();
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Appliance blocks
  for (let si = 0; si < optimized.schedule.length; si++) {
    const sched = optimized.schedule[si];
    const color = APPLIANCE_COLORS[si % APPLIANCE_COLORS.length];
    ctx.fillStyle = color + "aa";
    for (const h of sched.hours) {
      const x = chartL + h * barW + 1;
      const power = sched.totalKwh / sched.hours.length;
      const bh = (power / maxKw) * chartH;
      ctx.fillRect(x, chartB - bh, barW - 2, bh);
    }
  }

  // X-axis labels
  ctx.fillStyle = "#333";
  ctx.font = "9px sans-serif";
  ctx.textAlign = "center";
  for (let h = 0; h < 24; h += 2) {
    ctx.fillText(`${h}`, chartL + h * barW + barW / 2, H - 5);
  }

  // Y-axis label
  ctx.save();
  ctx.translate(10, chartT + chartH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText("kW", 0, 0);
  ctx.restore();

  // Legend
  ctx.font = "9px sans-serif";
  ctx.textAlign = "left";
  let lx = chartL;
  for (let si = 0; si < optimized.schedule.length; si++) {
    const sched = optimized.schedule[si];
    const color = APPLIANCE_COLORS[si % APPLIANCE_COLORS.length];
    ctx.fillStyle = color;
    ctx.fillRect(lx, 3, 8, 8);
    ctx.fillStyle = "#333";
    ctx.fillText(sched.name, lx + 10, 10);
    lx += ctx.measureText(sched.name).width + 18;
  }
}

function renderMonthlySelfConsumption(summary) {
  const el = document.getElementById("monthly-self-consumption");
  el.innerHTML = `
    <table style="width:100%; font-size:0.8rem;">
      <tr><th>Month</th><th>Self-cons (kWh)</th><th>Self-cons %</th><th>Savings (z\u0142)</th></tr>
      ${summary.map((s, i) => `<tr><td>${MONTHS[i]}</td><td>${s.selfKwh.toFixed(2)}</td><td>${s.selfPct.toFixed(1)}%</td><td>${s.savingsZl.toFixed(2)}</td></tr>`).join("")}
    </table>
  `;
}

function renderWarnings(warnings) {
  const panel = document.getElementById("warnings-panel");
  const el = document.getElementById("warnings-output");
  if (warnings.length === 0) {
    panel.style.display = "none";
    return;
  }
  panel.style.display = "";
  el.innerHTML = warnings
    .map(w => `<div style="margin: 0.3rem 0; font-size: 0.85rem;">&#9888; ${w}</div>`)
    .join("");
}

function renderTopDown({ terrainWidth, terrainHeight, cols, rows, panelWidth, panelHeight, cableLength }) {
  const canvas = document.getElementById("topdown-canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const margin = 50;
  const drawW = W - 2 * margin;
  const drawH = H - 2 * margin - 30;

  // Scale terrain to fit canvas
  const scale = Math.min(drawW / terrainWidth, drawH / terrainHeight);
  const tw = terrainWidth * scale;
  const th = terrainHeight * scale;
  const tx = margin + (drawW - tw) / 2;
  const ty = margin + 20 + (drawH - th) / 2;

  // Terrain rectangle
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 2;
  ctx.strokeRect(tx, ty, tw, th);
  ctx.fillStyle = "#e8f5e9";
  ctx.fillRect(tx, ty, tw, th);

  // Panels
  const pw = panelWidth * scale;
  const ph = panelHeight * scale;
  ctx.fillStyle = "#1565c0";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillRect(tx + c * pw + 1, ty + r * ph + 1, pw - 2, ph - 2);
    }
  }

  // Dimension labels
  ctx.fillStyle = "#333";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${terrainWidth}m`, tx + tw / 2, ty + th + 18);
  ctx.save();
  ctx.translate(tx - 12, ty + th / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${terrainHeight}m`, 0, 0);
  ctx.restore();

  // North arrow
  ctx.beginPath();
  ctx.moveTo(W - 30, 40);
  ctx.lineTo(W - 25, 55);
  ctx.lineTo(W - 35, 55);
  ctx.closePath();
  ctx.fillStyle = "#333";
  ctx.fill();
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("N", W - 30, 35);

  // Garage icon (bottom-right of canvas)
  const gx = tx + tw + 20, gy = ty + th - 20;
  ctx.fillStyle = "#795548";
  ctx.fillRect(gx, gy, 25, 20);
  ctx.fillStyle = "#fff";
  ctx.font = "8px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Garage", gx + 12, gy + 12);

  // Cable line
  ctx.beginPath();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "#f44336";
  ctx.lineWidth = 2;
  ctx.moveTo(tx + cols * pw, ty + rows * ph / 2);
  ctx.lineTo(gx, gy + 10);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#f44336";
  ctx.font = "9px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${cableLength}m`, (tx + cols * pw + gx) / 2 + 5, (ty + rows * ph / 2 + gy + 10) / 2 - 5);
}

function renderSideCrossSection({ tiltAngle, panelHeight }) {
  const canvas = document.getElementById("side-canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const groundY = H - 50;
  const panelLen = 150;

  // Ground line
  ctx.beginPath();
  ctx.strokeStyle = "#8d6e63";
  ctx.lineWidth = 3;
  ctx.moveTo(30, groundY);
  ctx.lineTo(W - 30, groundY);
  ctx.stroke();
  ctx.fillStyle = "#d7ccc8";
  ctx.fillRect(30, groundY, W - 60, 15);

  // Tilted panel
  const tiltRad = (tiltAngle * Math.PI) / 180;
  const baseX = 150;
  const baseY = groundY;
  const topX = baseX + panelLen * Math.cos(tiltRad);
  const topY = baseY - panelLen * Math.sin(tiltRad);

  // Mounting structure
  ctx.beginPath();
  ctx.strokeStyle = "#9e9e9e";
  ctx.lineWidth = 3;
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(baseX, topY + 20);
  ctx.stroke();
  ctx.moveTo(topX, baseY);
  ctx.lineTo(topX, topY);
  ctx.stroke();

  // Panel surface
  ctx.beginPath();
  ctx.strokeStyle = "#1565c0";
  ctx.lineWidth = 5;
  ctx.moveTo(baseX, baseY - 5);
  ctx.lineTo(topX, topY);
  ctx.stroke();
  ctx.fillStyle = "rgba(21, 101, 192, 0.3)";
  ctx.beginPath();
  ctx.moveTo(baseX, baseY - 5);
  ctx.lineTo(topX, topY);
  ctx.lineTo(topX, topY + 5);
  ctx.lineTo(baseX, baseY);
  ctx.fill();

  // Angle arc
  ctx.beginPath();
  ctx.strokeStyle = "#e65100";
  ctx.lineWidth = 1.5;
  ctx.arc(baseX, baseY, 40, -Math.PI, -Math.PI + tiltRad, false);
  ctx.stroke();
  ctx.fillStyle = "#e65100";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${tiltAngle.toFixed(1)}\u00b0`, baseX + 45, baseY - 8);

  // Row spacing annotation
  const spacing = panelHeight * Math.cos(tiltRad);
  const spX = topX + 30;
  ctx.beginPath();
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.moveTo(topX, baseY);
  ctx.lineTo(spX + 40, baseY);
  ctx.moveTo(topX + spacing * 3, baseY);
  ctx.lineTo(spX + 40, baseY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#666";
  ctx.font = "10px sans-serif";
  ctx.fillText(`row spacing`, spX + 5, baseY - 10);

  // Sun icon
  const sunX = W - 80, sunY = 50;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 18, 0, Math.PI * 2);
  ctx.fillStyle = "#ffb300";
  ctx.fill();
  ctx.strokeStyle = "#ff8f00";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Sun rays
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    ctx.beginPath();
    ctx.moveTo(sunX + 22 * Math.cos(a), sunY + 22 * Math.sin(a));
    ctx.lineTo(sunX + 30 * Math.cos(a), sunY + 30 * Math.sin(a));
    ctx.strokeStyle = "#ff8f00";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
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

function buildApplianceInputs() {
  const container = document.getElementById("appliance-list");
  container.innerHTML = state.appliances.map((app, i) => `
    <div style="display:flex; gap:0.3rem; align-items:center; margin:4px 0; font-size:0.8rem; flex-wrap:wrap;">
      <label style="display:flex; align-items:center; gap:2px; margin:0;">
        <input type="checkbox" class="app-toggle" data-idx="${i}" ${app.enabled ? "checked" : ""}>
      </label>
      <input type="text" value="${app.name}" data-idx="${i}" data-field="name" class="app-field" style="flex:2; min-width:80px;">
      <input type="number" value="${app.power}" data-idx="${i}" data-field="power" class="app-field" style="width:3.5rem;" step="0.1" min="0" title="kW">
      <span>kW</span>
      <input type="number" value="${app.duration}" data-idx="${i}" data-field="duration" class="app-field" style="width:3rem;" step="0.5" min="0.5" title="hours">
      <span>h</span>
      <input type="number" value="${app.timesPerWeek}" data-idx="${i}" data-field="timesPerWeek" class="app-field" style="width:2.5rem;" step="1" min="1" title="times/week">
      <span>/wk</span>
      <button type="button" class="remove-app" data-idx="${i}" style="cursor:pointer;">&times;</button>
    </div>
  `).join("");

  container.querySelectorAll(".app-field").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx);
      const field = e.target.dataset.field;
      state.appliances[idx][field] = field === "name" ? e.target.value : parseFloat(e.target.value) || 0;
      recalc();
    });
  });

  container.querySelectorAll(".app-toggle").forEach(input => {
    input.addEventListener("change", (e) => {
      state.appliances[parseInt(e.target.dataset.idx)].enabled = e.target.checked;
      recalc();
    });
  });

  container.querySelectorAll(".remove-app").forEach(btn => {
    btn.addEventListener("click", (e) => {
      state.appliances.splice(parseInt(e.target.dataset.idx), 1);
      buildApplianceInputs();
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
bindInput("base-load", "baseLoad");

document.getElementById("add-cost-item").addEventListener("click", () => {
  state.costItems.push({ name: "Custom", unitPrice: 0, quantity: 1 });
  buildCostInputs();
  recalc();
});

document.getElementById("add-appliance").addEventListener("click", () => {
  state.appliances.push({ name: "Custom", power: 1.0, duration: 1, timesPerWeek: 1, contiguous: false, enabled: true, defaultHour: 12 });
  buildApplianceInputs();
  recalc();
});

buildConsumptionInputs();
buildCostInputs();
buildApplianceInputs();
recalc();
