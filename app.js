import { getPSH } from "./location/calc.js";

const state = {
  latitude: 51.66,
};

function recalc() {
  const psh = getPSH(state.latitude);
  renderPSH(psh);
}

function renderPSH(psh) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const el = document.getElementById("psh-output");
  el.innerHTML = months
    .map((m, i) => `<div>${m}: <strong>${psh[i].toFixed(2)}</strong> h</div>`)
    .join("");
}

document.getElementById("latitude").addEventListener("input", (e) => {
  state.latitude = parseFloat(e.target.value) || 0;
  recalc();
});

recalc();
