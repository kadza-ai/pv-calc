# PV Solar Panel Calculator — Requirements

## Context

Personal tool for planning a ground-mounted, grid-tied photovoltaic system. Client-side only, no backend. Helps decide what to buy, where to place it, and estimate costs/payback. Currency: zl.

## Target User

The author — a homeowner with detailed consumption data, actively purchasing a system. This is a real buying decision tool, not a casual estimate.

## Inputs

### Location

- Location search (OpenStreetMap Nominatim, free) -> auto-fills latitude
- Latitude (default: 51.66 — Rzgow)

### Terrain

- Width (m)
- Height (m)
- Orientation (degrees from north)

### Panel Specs

- Panel width (default: 1.1m)
- Panel height (default: 1.7m)
- Panel wattage (default: 500W)

### System Settings

- Panel array rotation / azimuth (default: auto-calculated, overridable, affects production)
- Tilt angle (default: auto from latitude, overridable)
- System loss factor (default: 0.85)
- Peak power consumption (kW) — for inverter sizing

### Cable / Inverter

- Distance to inverter / garage (default: 75m)
- Direction to garage (N/S/E/W/NE/NW/SE/SW)
- Cable cross-section (recommended by tool, editable, standard sizes: 4, 6, 10, 16, 25, 35 mm2)
- Max acceptable voltage drop % (default: 2%)

### Consumption

- 12 monthly kWh values
- Electricity price (zl/kWh)

### Appliances

Defines household appliances to model optimal scheduling for maximizing solar self-consumption. This does **not** replace the monthly consumption inputs — appliances are used solely to generate scheduling advice.

#### Base Load

- Always-on base load (kW, default: 0.3) — fridge, standby, router, etc.

#### Predefined Appliances

Toggleable, with overridable defaults:

| Appliance       | Power (kW) | Duration (h) | Runs/week | Default time |
| --------------- | ---------- | ------------ | --------- | ------------ |
| Dishwasher      | 1.8        | 2            | 5         | 13:00        |
| Washing machine | 2.0        | 1.5          | 4         | 10:00        |
| Tumble dryer    | 2.5        | 1.5          | 3         | 12:00        |
| EV charger      | 3.7        | 6            | 7         | 22:00        |
| Oven / cooktop  | 2.5        | 1            | 7         | 18:00        |

Plus ability to add custom appliances (name + power + duration + runs/week + preferred time).

### Costs

Predefined items:

1. Panels (quantity auto-filled from calculation x unit price)
2. Inverter (quantity: 1 x price)
3. Mounting / racking (lump sum)
4. Wiring / cables (lump sum)
5. Grid-tie / meter equipment (lump sum)
6. Installation labor (lump sum)

Plus ability to add custom line items (name + amount).

## Outputs

### System Specs

- Number of panels, total kWp
- Inverter size
- Tilt angle, azimuth
- Recommended cable cross-section + actual voltage drop %

### Monthly Production vs. Consumption

- Per-month comparison
- Savings per month = min(production, consumption) x electricity price
- No surplus/export value — overproduction is ignored

### Appliance Schedule & Self-Consumption

- **Hourly solar production curve**: sunrise/sunset-aware bell curve per month, derived from latitude and monthly production totals
- **Optimized schedule table**: 12 rows (months) x N columns (appliances), each cell = recommended start time
  - Greedy placement: largest energy consumers placed first into hours with highest solar surplus
  - Constraint: combined appliance draw in any hour must not exceed solar production for that hour
  - Base load subtracted from solar surplus before appliance placement
- **Per-month self-consumption summary**:
  - Self-consumed energy (kWh), self-consumption ratio (%), savings (zl)
- **Naive vs. optimized comparison**: shows user's default schedule alongside optimized schedule with delta in self-consumption % and savings (zl) — answers "is it worth changing my habits?"
- **Hourly chart with month selector**: solar production curve with colored appliance blocks overlaid, showing how scheduled appliances fit under the production curve

### Financials

- Total itemized cost
- Annual savings
- Payback period (years) = total cost / annual savings

### Visualizations

- **Top-down view**: terrain rectangle with dimensions, north arrow, panel array with dimensions and rotation, garage icon with dashed cable line + distance label. Terrain aligned to canvas edges. Split scale so panel detail is readable despite long cable distance.
- **Side cross-section**: tilted panel, angle arc, row spacing annotation, sun icon.

## Key Behaviors

- Azimuth correction factor applied to production (simplified cosine-based)
- Cable voltage drop loss included in production calculation
- Tilt auto-calculated from latitude, azimuth auto-calculated from hemisphere — both overridable
- All "constants" are editable inputs with sensible defaults
- Peak Sun Hours estimated from latitude lookup with interpolation
- Hourly production profile derived from sunrise/sunset times (calculated from latitude + month) as a bell curve within daylight hours
- Appliance scheduling uses greedy algorithm to maximize self-consumption: base load first, then largest consumers placed into hours with most solar surplus, never exceeding hourly production capacity

## Warnings

- Latitude > 66.5 deg (extreme low solar)
- Area too small for any panels
- Area insufficient for target consumption

## Implementation

### Tech Stack

- Vanilla JS with ES modules, no framework, no build tools
- Requires a simple local server for ES modules (e.g., `npx serve`)

### Project Structure

```
index.html
css/
  main.css                  — global layout, reset, shared styles
js/
  app.js                    — central state, orchestrator, full recalc on any change
  location/
    calc.js
    LocationInput.js
    location.css
  terrain/
    calc.js
    TerrainInput.js
    TopDownCanvas.js
    terrain.css
  panels/
    calc.js
    PanelSpecsInput.js
    SystemSettings.js
    SideViewCanvas.js
    panels.css
  cable/
    calc.js
    CableSettings.js
    cable.css
  consumption/
    calc.js
    ConsumptionInput.js
    MonthlyChart.js         — bar chart, two bars per month (production + consumption)
    consumption.css
  appliances/
    calc.js
    ApplianceInput.js
    ScheduleChart.js
    appliances.css
  costs/
    calc.js
    CostTable.js
    costs.css
  results/
    calc.js
    SystemResults.js
    FinancialResults.js
    results.css
```

### Architecture

- **Feature-based folders**: each feature contains its calculations, UI components, and CSS together
- **Components self-load CSS**: each component injects its own stylesheet
- **Central state in app.js**: any input change triggers full recalculation and re-render of all outputs
- **Minimal CSS**: just enough to be functional, styling refined later

### UI Layout

- **Desktop**: two-column grid — inputs (left), results (right)
- **Below**: two canvases side by side — top-down panel layout + side cross-section
- **Mobile**: stacks vertically

## Future (Phase 2)

- Battery storage option
