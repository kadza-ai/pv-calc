# PRD: PV Solar Panel Calculator

## Problem Statement

A homeowner in Rzgow, Poland is actively planning a ground-mounted, grid-tied photovoltaic system and needs a tool to make informed purchasing decisions. Existing online calculators are either too simplistic (no appliance scheduling, no cable sizing) or too complex (require professional knowledge). There is no single tool that combines panel layout, electrical configuration, appliance self-consumption optimization, and financial payback analysis in one client-side application tailored to a specific purchase decision.

## Solution

A client-side web application (no backend) that takes terrain dimensions, panel specs, consumption data, and appliance profiles as inputs, then calculates:

- Optimal panel layout and string configuration
- Cable sizing with voltage drop analysis
- Monthly production vs. consumption with savings
- Appliance scheduling optimized for solar self-consumption
- Inflation-adjusted financial payback period

The tool provides visual aids (top-down terrain view, side cross-section, charts) and advisory warnings. All calculated defaults are overridable. Currency is PLN (zl).

## User Stories

1. As a homeowner, I want to enter my terrain dimensions and see how many panels fit, so that I know the maximum system size my land supports.
2. As a homeowner, I want the tool to auto-calculate panel rows and columns from terrain dimensions, so that I don't need to do geometry manually.
3. As a homeowner, I want to override the auto-calculated panel grid (rows x columns), so that I can explore alternative layouts.
4. As a homeowner, I want to see the tilt angle auto-calculated from my latitude, so that I get an optimal default without research.
5. As a homeowner, I want to override the tilt angle, so that I can account for practical constraints.
6. As a homeowner, I want the azimuth auto-calculated (due south for northern hemisphere), so that I start with the optimal orientation.
7. As a homeowner, I want to override the azimuth, so that I can match my terrain's actual orientation.
8. As a homeowner, I want a cosine-based azimuth correction applied to production estimates, so that non-optimal orientations show realistic output.
9. As a homeowner, I want to enter 12 monthly electricity consumption values, so that the tool uses my real usage data.
10. As a homeowner, I want to enter my electricity price per kWh, so that savings are calculated in my actual currency.
11. As a homeowner, I want to set an annual electricity price inflation rate (default 3%), so that payback calculations account for rising prices.
12. As a homeowner, I want to see monthly production vs. consumption as a grouped bar chart, so that I can visually compare seasonal patterns.
13. As a homeowner, I want monthly savings calculated as min(production, consumption) x price, so that overproduction isn't counted as income.
14. As a homeowner, I want to see total system cost broken down by line item, so that I understand where the money goes.
15. As a homeowner, I want to add custom cost line items, so that I can include project-specific expenses.
16. As a homeowner, I want the panel quantity auto-filled in the cost table, so that costs stay in sync with the layout.
17. As a homeowner, I want to see the inflation-adjusted payback period (year when cumulative savings exceed total cost), so that I can evaluate the investment.
18. As a homeowner, I want to define my household appliances with power, duration, and frequency, so that the tool can optimize their scheduling.
19. As a homeowner, I want predefined appliances (dishwasher, washing machine, tumble dryer, EV charger, oven) with toggleable defaults, so that I can quickly set up my profile.
20. As a homeowner, I want to add custom appliances, so that I can model my specific household.
21. As a homeowner, I want a base load input (default 0.3 kW), so that always-on consumption is subtracted before appliance scheduling.
22. As a homeowner, I want the tool to generate an optimized appliance schedule per month that maximizes solar self-consumption, so that I minimize grid draw.
23. As a homeowner, I want the greedy scheduler to place the largest energy consumers first into hours with the highest solar surplus, so that scheduling is optimal.
24. As a homeowner, I want appliances to be splittable across non-contiguous hours where appropriate, so that the scheduler can fit more consumption under the solar curve. (Exception: dishwasher and similar appliances that must run continuously are kept contiguous.)
25. As a homeowner, I want the scheduler to minimize grid draw as a soft target (not hard-block scheduling when solar is insufficient), so that I still get useful recommendations in low-production months.
26. As a homeowner, I want to see a naive vs. optimized schedule comparison showing delta in self-consumption % and savings, so that I know if changing habits is worthwhile.
27. As a homeowner, I want an hourly chart with a month selector showing the solar production curve with colored appliance blocks overlaid, so that I can see how scheduled appliances fit under the curve.
28. As a homeowner, I want to see per-month self-consumption summary (kWh, %, savings in zl), so that I have precise numbers.
29. As a homeowner, I want the tool to calculate string configuration (series/parallel) from the panel layout, so that I know how to wire the system.
30. As a homeowner, I want the system voltage derived from string configuration, so that cable sizing is accurate.
31. As a homeowner, I want a recommended cable cross-section based on voltage drop calculation, so that I buy the right cable.
32. As a homeowner, I want to set the distance to my garage/inverter and max acceptable voltage drop %, so that the recommendation fits my site.
33. As a homeowner, I want to see the actual voltage drop % for the selected cable, so that I can verify it's within limits.
34. As a homeowner, I want cable voltage drop loss included in production calculations, so that estimates are realistic.
35. As a homeowner, I want to see a top-down terrain view with panel array, dimensions, north arrow, garage icon, and cable line, so that I can visualize the installation.
36. As a homeowner, I want the top-down view to use an inset/breakaway approach for split scale, so that panel detail is readable despite long cable distances.
37. As a homeowner, I want to see a side cross-section with tilted panel, angle arc, row spacing annotation, and sun icon, so that I understand the physical setup.
38. As a homeowner, I want advisory warnings when latitude exceeds 66.5 degrees, so that I know solar production will be extremely low.
39. As a homeowner, I want advisory warnings when the terrain area is too small for any panels, so that I know the site won't work.
40. As a homeowner, I want advisory warnings when the area is insufficient to cover my consumption, so that I set realistic expectations.
41. As a homeowner, I want advisory warnings when voltage drop exceeds the max acceptable threshold, so that I can upsize the cable.
42. As a homeowner, I want advisory warnings when the inverter may be undersized for the system, so that I avoid equipment mismatch.
43. As a homeowner, I want all warnings to be advisory (non-blocking), so that I can still see results and make my own judgment.
44. As a homeowner, I want the UI to be a two-column layout on desktop (inputs left, results right) and stack vertically on mobile, so that it's usable on any device.
45. As a homeowner, I want any input change to trigger a full recalculation, so that results are always in sync.
46. As a homeowner, I want all "constants" to have sensible defaults but be editable, so that I can customize without starting from scratch.

## Implementation Decisions

### Architecture
- **Client-side only**: Vanilla JS with ES modules, no framework, no build tools. Requires a simple local server for ES modules (e.g., `npx serve`).
- **Central state in app.js**: Any input change triggers full recalculation and re-render of all outputs. No partial updates.
- **Feature-based folder structure**: Each feature (location, terrain, panels, cable, consumption, appliances, costs, results) contains its calculations, UI components, and CSS together.
- **Components self-load CSS**: Each component injects its own stylesheet.

### Modules

1. **location/calc** — Peak Sun Hours lookup table with latitude interpolation. Hardcoded for Rzgow (lat 51.66) as default. Table covers latitude bands (e.g., every 5° from 0–65°) with 12 monthly PSH values, linearly interpolated.

2. **terrain/calc** — Panel fit calculation. Takes terrain width/height and panel dimensions (portrait orientation: 1.1m wide x 1.7m tall). Calculates max columns and rows. No edge margin. No inter-row shading calculation (single construction, e.g., 2x10).

3. **panels/calc** — String configuration derived from panel layout. Calculates panels in series/parallel, system voltage, total kWp. Assumes 800V DC max inverter input voltage. Tilt default = latitude-based, azimuth default = due south. Production uses cosine-based azimuth correction. Inverter sized at DC/AC ratio of 1.0 (editable).

4. **cable/calc** — Voltage drop calculation based on system voltage from string config, cable length (distance to garage), and cable cross-section. Recommends smallest standard cable size (4, 6, 10, 16, 25, 35 mm²) that keeps voltage drop under the max threshold (default 2%). Voltage drop loss subtracted from production.

5. **consumption/calc** — Monthly production estimation using PSH × system kWp × loss factor × azimuth correction × (1 - cable loss). Monthly savings = min(production, consumption) × electricity price.

6. **appliances/calc** — Hourly solar production curve per month: bell curve fitted between sunrise and sunset (calculated from latitude + mid-month day-of-year). Greedy scheduling algorithm: subtract base load from hourly solar, then place appliances largest-energy-first into hours with most surplus. Appliances can be split across hours to maximize fit. Minimizes grid draw as soft target. Produces naive (user default times) vs. optimized comparison.

7. **costs/calc** — Itemized cost table with predefined categories (panels, inverter, mounting, wiring, grid-tie, labor) plus custom line items. Panel quantity auto-filled from layout. Payback = year when cumulative inflation-adjusted savings (default 3%/year) exceed total cost.

8. **results/calc** — Aggregates outputs from other modules: system specs, financial summary, warnings.

### UI Components
- Input forms per module (left column on desktop)
- Results display per module (right column on desktop)
- Two canvases below: top-down terrain view (with inset/breakaway for cable distance) and side cross-section
- Monthly production vs. consumption grouped bar chart (12 month pairs)
- Hourly schedule chart with month selector (solar curve + colored appliance blocks)
- Desktop: two-column grid. Mobile: vertical stack.

### Warnings (Advisory)
- Latitude > 66.5° (extreme low solar)
- Terrain too small for any panels
- System insufficient to cover annual consumption
- Voltage drop exceeds max acceptable %
- Inverter potentially undersized for system kWp
- String voltage exceeds inverter max input voltage
- Monthly production is zero (winter months at high latitudes)

## Testing Decisions

### What Makes a Good Test
Tests should verify **external behavior through the module's public interface**, not implementation details. Given inputs, assert expected outputs. Do not test internal helper functions directly — test them through the calc module's exported API. Tests should be deterministic and not depend on DOM or rendering.

### Modules Under Test

1. **location/calc** — Test PSH interpolation at known latitudes and boundary conditions (equator, 65°, exact table entries vs. interpolated values). Verify 12 monthly values returned.

2. **terrain/calc** — Test panel fit for various terrain/panel dimensions. Edge cases: terrain smaller than one panel, exact fit, non-integer fits.

3. **panels/calc** — Test string configuration: series/parallel calculation, system voltage within inverter limits, tilt/azimuth defaults for different latitudes.

4. **cable/calc** — Test voltage drop calculation against known values. Test cable recommendation selects correct size. Test edge cases: very long distances, very low voltages.

5. **consumption/calc** — Test monthly production calculation. Test savings = min(production, consumption) × price. Test with zero consumption and zero production months.

6. **appliances/calc** — Test hourly bell curve shape (symmetric, zero outside daylight). Test greedy scheduler: single appliance, multiple appliances, overflow behavior, contiguous constraint. Test naive vs. optimized comparison produces correct deltas.

7. **costs/calc** — Test itemized total. Test inflation-adjusted payback calculation against manual computation. Test with zero costs, zero savings.

### Test Runner
Simple test runner compatible with vanilla JS / ES modules (no Jest dependency). Could use Node.js built-in test runner or a lightweight library.

## Out of Scope

- **Battery storage** — deferred to Phase 2
- **Grid export/feed-in tariff** — overproduction is ignored, no surplus value
- **Backend/server** — entirely client-side
- **Loan/financing modeling** — lump sum cost only
- **Shading analysis** — single construction, no inter-row shading calculation
- **Multiple panel arrays** — single uniform array only
- **Weather data or API-based irradiance** — uses latitude-based PSH lookup table
- **User accounts or data persistence** — no login, no cloud storage
- **Location search via Nominatim** — latitude hardcoded for Rzgow

## Further Notes

- Currency is PLN (zl) throughout
- Default latitude is 51.66 (Rzgow, Poland)
- The tool is designed for a single user making a real purchasing decision — optimized for accuracy over broad usability
- All calculated defaults (tilt, azimuth, cable size, string config, panel layout) are overridable by the user
- The hourly production profile is a simplified bell curve, not based on real irradiance data — acceptable for planning purposes
- Appliance scheduling is a heuristic (greedy), not a global optimizer — good enough for the "is it worth changing habits?" question
