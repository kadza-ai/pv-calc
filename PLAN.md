# Plan: PV Solar Panel Calculator

> Source PRD: `PRD.md`

## Architectural decisions

Durable decisions that apply across all phases:

- **Tech stack**: Vanilla JS with ES modules, no framework, no build tools. Requires simple local server (e.g. `npx serve`)
- **State management**: Central state object in `app.js`. Any input change triggers full recalculation and re-render of all outputs
- **UI pattern**: Feature-based folders — each feature contains its calc.js, UI components, and CSS together. Components self-load their CSS
- **Layout**: Two-column desktop grid (inputs left, results right), canvases below side-by-side, mobile stacks vertically
- **Data flow**: Inputs -> central state -> recalc all -> re-render all outputs
- **External APIs**: OpenStreetMap Nominatim for location search (free, no key required)
- **Currency**: zl (Polish zloty)
- **No backend**: Everything client-side, no data persistence

---

## Phase 1: Scaffold + Location

**User stories**: App shell, HTML skeleton, two-column layout, central state, location search with Nominatim, latitude auto-fill

### What to build

Create the app shell with `index.html`, global CSS, and `app.js` with the central state object and recalc/re-render loop. Implement the location module: a search input that queries OpenStreetMap Nominatim, auto-fills latitude, and a manual latitude input (default 51.66). On any change, state updates and triggers a recalc cycle (which at this point has nothing else to recalculate). The two-column layout should be in place with the location section as the first input panel.

### Acceptance criteria

- [ ] `index.html` loads with two-column desktop layout (inputs left, results right)
- [ ] Central state in `app.js` initializes and triggers recalc on state changes
- [ ] Location search queries Nominatim and populates latitude from results
- [ ] Latitude input has default 51.66, is manually editable
- [ ] Mobile layout stacks vertically

---

## Phase 2: Terrain + Top-Down Canvas

**User stories**: Terrain dimensions and orientation input, top-down canvas visualization with terrain rectangle, north arrow, and dimensions

### What to build

Add the terrain input section (width, height, orientation in degrees from north). Render a top-down canvas showing the terrain as a rectangle with dimension labels and a north arrow indicating orientation. The canvas should use a split scale approach so detail remains readable. State changes in terrain inputs trigger canvas re-render.

### Acceptance criteria

- [ ] Width (m), height (m), and orientation (degrees) inputs are functional
- [ ] Top-down canvas draws terrain rectangle with correct proportions
- [ ] North arrow displays and reflects orientation
- [ ] Dimension labels shown on canvas
- [ ] Canvas re-renders on any terrain input change

---

## Phase 3: Panel Specs + Layout Calculation

**User stories**: Panel dimensions/wattage input, system settings (tilt, azimuth, loss factor), panel count calculation, panels on top-down canvas, side-view canvas with tilt

### What to build

Add panel specs inputs (width default 1.1m, height default 1.7m, wattage default 500W) and system settings (azimuth auto-calculated from hemisphere, tilt auto from latitude, loss factor default 0.85, peak power consumption). Calculate how many panels fit in the terrain area accounting for row spacing from tilt angle. Draw panels on the top-down canvas. Add the side-view canvas showing a tilted panel with angle arc and row spacing annotation.

### Acceptance criteria

- [ ] Panel width, height, wattage inputs with defaults
- [ ] Tilt auto-calculated from latitude, azimuth auto-calculated from hemisphere — both overridable
- [ ] System loss factor input (default 0.85)
- [ ] Panel count calculated from terrain area and panel dimensions with row spacing
- [ ] Panels drawn on top-down canvas within terrain rectangle
- [ ] Side-view canvas shows tilted panel with angle arc, row spacing, and sun icon
- [ ] Number of panels and total kWp displayed in results

---

## Phase 4: Cable + Voltage Drop

**User stories**: Cable/inverter inputs, voltage drop calculation, recommended cable size, garage icon and cable line on top-down canvas

### What to build

Add cable settings: distance to inverter/garage (default 75m), direction to garage, cable cross-section (auto-recommended, editable, standard sizes), max voltage drop % (default 2%). Calculate voltage drop and recommend the minimum cable cross-section that keeps it within the threshold. Display the garage icon on the top-down canvas with a dashed cable line and distance label.

### Acceptance criteria

- [ ] Distance, direction, cable cross-section, and max voltage drop inputs functional
- [ ] Voltage drop calculated from distance, current, and cable cross-section
- [ ] Cable cross-section auto-recommended to meet voltage drop threshold
- [ ] Recommended cable size and actual voltage drop % shown in results
- [ ] Garage icon, dashed cable line, and distance label on top-down canvas

---

## Phase 5: Production Calculation

**User stories**: Peak sun hours from latitude, monthly production calculation, azimuth/tilt/loss corrections, cable loss applied

### What to build

Implement the production calculation engine. Estimate peak sun hours from latitude using lookup with interpolation. Calculate monthly production per panel applying azimuth correction (cosine-based), tilt correction, system loss factor, and cable voltage drop loss. Display monthly production values and total annual production in results.

### Acceptance criteria

- [ ] Peak sun hours estimated from latitude with interpolation
- [ ] Monthly production calculated for each of 12 months
- [ ] Azimuth correction factor applied (cosine-based)
- [ ] Tilt and system loss factor applied
- [ ] Cable voltage drop loss subtracted from production
- [ ] Monthly and annual production totals displayed in results

---

## Phase 6: Consumption + Monthly Comparison

**User stories**: 12 monthly kWh inputs, electricity price, monthly bar chart (production vs consumption), savings calculation

### What to build

Add the consumption input section: 12 monthly kWh fields and electricity price (zl/kWh). Calculate monthly savings as `min(production, consumption) x price`. No surplus/export value — overproduction is ignored. Render a bar chart with two bars per month (production and consumption).

### Acceptance criteria

- [ ] 12 monthly kWh input fields functional
- [ ] Electricity price input (zl/kWh)
- [ ] Monthly savings calculated as min(production, consumption) x price
- [ ] Overproduction ignored (no export value)
- [ ] Bar chart renders with two bars per month (production + consumption)
- [ ] Monthly savings displayed in results

---

## Phase 7: Costs + Financials

**User stories**: Predefined cost items, custom line items, total cost, annual savings, payback period

### What to build

Add the cost table with predefined items: panels (quantity auto-filled x unit price), inverter, mounting/racking, wiring/cables, grid-tie equipment, installation labor. Allow adding custom line items (name + amount). Calculate total itemized cost, annual savings (sum of monthly savings), and payback period (total cost / annual savings).

### Acceptance criteria

- [ ] Predefined cost items with auto-filled panel quantity
- [ ] Custom line items can be added (name + amount)
- [ ] Total itemized cost calculated
- [ ] Annual savings calculated from monthly savings
- [ ] Payback period (years) = total cost / annual savings
- [ ] Financial results displayed in results section

---

## Phase 8: Appliance Inputs + Hourly Production Curve

**User stories**: Base load input, predefined appliance table with toggle/override, custom appliances, sunrise/sunset-aware hourly production curve

### What to build

Add the appliances input section between consumption and costs. Include a base load field (kW, default 0.3). Render predefined appliances (dishwasher, washing machine, tumble dryer, EV charger, oven/cooktop) as a toggleable table with overridable defaults for power, duration, runs/week, and preferred time. Allow adding custom appliances. Implement the hourly solar production curve: calculate sunrise/sunset from latitude and month (declination angle formula), distribute monthly production as a bell curve within daylight hours.

### Acceptance criteria

- [ ] Base load input (kW, default 0.3)
- [ ] 5 predefined appliances displayed as toggleable rows with editable defaults
- [ ] Custom appliances can be added (name + power + duration + runs/week + preferred time)
- [ ] Sunrise/sunset times calculated from latitude and month
- [ ] Hourly production bell curve generated within daylight hours per month
- [ ] Curve area equals the monthly production total (from Phase 5)

---

## Phase 9: Appliance Scheduling + Self-Consumption Output

**User stories**: Greedy schedule optimizer, optimized schedule table, self-consumption metrics, naive vs optimized comparison, hourly chart with month selector

### What to build

Implement the greedy scheduling algorithm: subtract base load from hourly solar surplus, then place appliances largest-energy-first into hours with highest remaining surplus, respecting the constraint that combined appliance draw must not exceed solar production in any hour. Compute both naive schedules (user's default times) and optimized schedules. Output a 12-month x N-appliance schedule table with recommended start times. Show per-month self-consumption (kWh, %, savings in zl). Display naive vs optimized comparison with delta savings. Add an hourly chart with month selector showing the production curve with colored appliance blocks overlaid.

### Acceptance criteria

- [ ] Greedy algorithm places appliances to maximize self-consumption
- [ ] Combined appliance draw never exceeds solar production in any hour
- [ ] Base load subtracted before appliance placement
- [ ] Schedule table shows 12 months x N appliances with recommended start times
- [ ] Per-month self-consumption: kWh, ratio %, savings (zl)
- [ ] Naive vs optimized comparison shows delta in self-consumption % and savings
- [ ] Hourly chart with month selector shows production curve + colored appliance blocks

---

## Phase 10: Warnings + Polish

**User stories**: Latitude warning, area warnings, mobile responsiveness, edge cases

### What to build

Add warning banners for: latitude > 66.5 (extreme low solar), area too small for any panels, area insufficient for target consumption. Review and fix mobile responsive layout across all sections. Handle edge cases: zero inputs, missing values, extreme latitudes, no appliances enabled.

### Acceptance criteria

- [ ] Warning shown when latitude > 66.5
- [ ] Warning shown when area fits zero panels
- [ ] Warning shown when production cannot meet consumption
- [ ] All sections render correctly on mobile (stacked vertically)
- [ ] No crashes or broken UI with zero/empty/extreme inputs
