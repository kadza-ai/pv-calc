/**
 * Calculate sunrise/sunset hours for a given latitude and month.
 * Uses simplified day-length formula.
 */
function getDaylight(latitude, month) {
  // Day of year at mid-month
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let doy = 0;
  for (let i = 0; i < month; i++) doy += daysInMonth[i];
  doy += Math.floor(daysInMonth[month] / 2);

  // Solar declination (simplified)
  const declination = 23.45 * Math.sin(((360 / 365) * (doy - 81)) * Math.PI / 180);
  const latRad = latitude * Math.PI / 180;
  const declRad = declination * Math.PI / 180;

  // Hour angle at sunrise/sunset
  let cosHa = -Math.tan(latRad) * Math.tan(declRad);
  cosHa = Math.max(-1, Math.min(1, cosHa)); // clamp for polar regions
  const ha = Math.acos(cosHa) * 180 / Math.PI;
  const dayLengthHours = (2 * ha) / 15;

  const solarNoon = 12;
  const sunrise = solarNoon - dayLengthHours / 2;
  const sunset = solarNoon + dayLengthHours / 2;

  return { sunrise, sunset, dayLengthHours };
}

/**
 * Generate hourly solar production curve (bell curve) for a given month.
 * Returns array of 24 values (kW per hour).
 */
export function generateSolarCurve({ latitude, month, totalKwp, azimuthCorrectionFactor, cableLossPct, lossFactor, pshForMonth }) {
  const { sunrise, sunset } = getDaylight(latitude, month);
  const dailyKwh = pshForMonth * totalKwp * lossFactor * azimuthCorrectionFactor * (1 - cableLossPct / 100);

  // Build bell curve between sunrise and sunset
  const curve = new Array(24).fill(0);
  const mid = (sunrise + sunset) / 2;
  const sigma = (sunset - sunrise) / 6; // ~99.7% of energy within daylight

  if (sigma <= 0 || dailyKwh <= 0) return curve;

  // Raw bell values
  let rawSum = 0;
  for (let h = 0; h < 24; h++) {
    if (h >= Math.floor(sunrise) && h < Math.ceil(sunset)) {
      const hMid = h + 0.5; // center of hour
      curve[h] = Math.exp(-0.5 * ((hMid - mid) / sigma) ** 2);
      rawSum += curve[h];
    }
  }

  // Scale so total = dailyKwh
  if (rawSum > 0) {
    const scale = dailyKwh / rawSum;
    for (let h = 0; h < 24; h++) curve[h] *= scale;
  }

  return curve;
}

/**
 * Greedy scheduler: place appliances into hours with most solar surplus.
 * @param {number[]} available - available solar kW per hour (after base load)
 * @param {object[]} appliances - sorted by energy descending
 * @returns {object[]} schedule entries: { name, hours: number[], kwhUsed }
 */
function greedySchedule(available, appliances) {
  const avail = [...available];
  const schedule = [];

  for (const app of appliances) {
    const energyNeeded = app.power * app.duration;
    let hoursNeeded = app.duration;
    const assignedHours = [];
    let kwhUsed = 0;

    if (app.contiguous) {
      // Find best contiguous window
      let bestStart = -1;
      let bestSurplus = -Infinity;
      for (let start = 0; start <= 24 - hoursNeeded; start++) {
        let surplus = 0;
        for (let h = 0; h < hoursNeeded; h++) surplus += avail[start + h];
        if (surplus > bestSurplus) {
          bestSurplus = surplus;
          bestStart = start;
        }
      }
      if (bestStart >= 0) {
        for (let h = 0; h < hoursNeeded; h++) {
          const hour = bestStart + h;
          assignedHours.push(hour);
          const used = Math.min(app.power, avail[hour]);
          kwhUsed += used;
          avail[hour] = Math.max(0, avail[hour] - app.power);
        }
      }
    } else {
      // Splittable: pick hours with highest surplus
      const hoursByAvail = Array.from({ length: 24 }, (_, i) => i)
        .sort((a, b) => avail[b] - avail[a]);

      for (const hour of hoursByAvail) {
        if (hoursNeeded <= 0) break;
        assignedHours.push(hour);
        const used = Math.min(app.power, avail[hour]);
        kwhUsed += used;
        avail[hour] = Math.max(0, avail[hour] - app.power);
        hoursNeeded--;
      }
      assignedHours.sort((a, b) => a - b);
    }

    schedule.push({ name: app.name, hours: assignedHours, kwhUsed, totalKwh: energyNeeded });
  }

  return schedule;
}

/**
 * Generate naive schedule: appliances at default hours.
 */
function naiveSchedule(solarCurve, baseLoad, appliances) {
  const schedule = [];
  for (const app of appliances) {
    const startHour = app.defaultHour ?? 18; // evening default
    const hours = [];
    let kwhUsed = 0;
    for (let h = 0; h < app.duration; h++) {
      const hour = (startHour + h) % 24;
      hours.push(hour);
      const available = Math.max(0, solarCurve[hour] - baseLoad);
      kwhUsed += Math.min(app.power, available);
    }
    schedule.push({ name: app.name, hours, kwhUsed, totalKwh: app.power * app.duration });
  }
  return schedule;
}

/**
 * Calculate appliance scheduling for a given month.
 */
export function calcAppliances({ latitude, month, totalKwp, azimuthCorrectionFactor, cableLossPct, lossFactor, pshForMonth, baseLoad, appliances }) {
  const solarCurve = generateSolarCurve({ latitude, month, totalKwp, azimuthCorrectionFactor, cableLossPct, lossFactor, pshForMonth });

  // Available after base load
  const available = solarCurve.map(v => Math.max(0, v - baseLoad));

  // Sort appliances by energy (largest first) for greedy
  const sorted = [...appliances]
    .filter(a => a.enabled)
    .map(a => ({
      ...a,
      energy: a.power * a.duration * (a.timesPerWeek / 7),
    }))
    .sort((a, b) => b.energy - a.energy);

  const optimizedSchedule = greedySchedule(available, sorted);
  const naiveResult = naiveSchedule(solarCurve, baseLoad, sorted);

  const dailyProduction = solarCurve.reduce((s, v) => s + v, 0);

  const optimizedSelfKwh = optimizedSchedule.reduce((s, e) => s + e.kwhUsed, 0);
  const naiveSelfKwh = naiveResult.reduce((s, e) => s + e.kwhUsed, 0);
  const totalApplianceKwh = sorted.reduce((s, a) => s + a.power * a.duration, 0);

  return {
    solarCurve,
    optimized: {
      schedule: optimizedSchedule,
      selfConsumptionKwh: optimizedSelfKwh,
      selfConsumptionPct: dailyProduction > 0 ? (optimizedSelfKwh / dailyProduction) * 100 : 0,
      gridDraw: Math.max(0, totalApplianceKwh - optimizedSelfKwh),
    },
    naive: {
      schedule: naiveResult,
      selfConsumptionKwh: naiveSelfKwh,
      selfConsumptionPct: dailyProduction > 0 ? (naiveSelfKwh / dailyProduction) * 100 : 0,
      gridDraw: Math.max(0, totalApplianceKwh - naiveSelfKwh),
    },
  };
}
