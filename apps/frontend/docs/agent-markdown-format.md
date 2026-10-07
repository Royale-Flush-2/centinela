# Agent Markdown format (alert detail)

The Strategist agent delivers the detail of each alert as a Markdown file. Centinela reads it with a config, in the style of Liquid sections, and builds the detail screen by itself: each `# heading` says **which component** is drawn and each `## slot:` says **which field** of that component is filled.

- Config (source of truth for components, slots and types): [server/agent/centinela.config.json](../server/agent/centinela.config.json)
- Full, valid examples: [server/agent/alerts/ALR-1002-017.en.md](../server/agent/alerts/ALR-1002-017.en.md) (English) and [ALR-1002-017.es.md](../server/agent/alerts/ALR-1002-017.es.md) (Spanish)
- Reader: [server/centinelaMd.ts](../server/centinelaMd.ts) · Templates: [src/components/detail/blocks.tsx](../src/components/detail/blocks.tsx)

```
agent ──► alert.md ──► reader + centinela.config.json ──► { view: zones → components } ──► React templates
```

## Contents

1. [Syntax rules](#1-syntax-rules)
2. [Languages](#2-languages)
3. [How the screen is ordered](#3-how-the-screen-is-ordered)
4. [Value types](#4-value-types)
5. [Supported components](#5-supported-components)
6. [Validation: errors and warnings](#6-validation-errors-and-warnings)
7. [Minimal template to copy](#7-minimal-template-to-copy)
8. [Where the file is delivered](#8-where-the-file-is-delivered)
9. [Adding a component or a slot](#9-adding-a-component-or-a-slot)
10. [Common mistakes](#10-common-mistakes)

---

## 1. Syntax rules

```markdown
# kpi                      ← opens a component (name from the config)
Coverage                   ← loose text: goes to the component's default slot (here, "label")

## value: 4.2              ← slot with the value on the same line
## note:                   ← slot with the value on the following lines
Minimum 10 days
```

| Rule | Detail |
|---|---|
| `# name` | Opens a component. It must exist in the config `components`. Everything that follows, up to the next `#`, belongs to it. |
| Loose text | Text between `# name` and the first `##` goes to the component's **default slot** (`default_slot` in the config). If the component has none, it is ignored and a warning is added. |
| `## slot:` | Opens a slot. The value can be on the same line, after `:`, or on the following lines up to the next `##` or `#`. The `:` is optional (`## note` also works). |
| Flexible names | Components and slots are matched without case or accents, and spaces or hyphens count as `_`: `## Detected at`, `## detected_at` and `## detected-at` are the same slot. |
| Aliases | Every component and slot also accepts its Spanish name from the original format (`# grafico` = `# chart`, `## pesos en riesgo` = `## amount at risk`), plus a few others (`## priority` = `severity`, `## topic` = `type`). They are in the "Aliases" column of section 5. |
| Repeatable | If a component can repeat (`kpi`, `cause`, `action`, `evidence`), each `#` adds one more item, in file order. |
| Code blocks | Inside a triple-backtick block, lines with `#` do **not** open components, so SQL can have `#` comments. |
| `###` or deeper | Opens nothing; treated as text of the current slot. |
| Before the first `#` | Ignored. Useful for agent notes. |
| Empty slot | A slot without text is not stored. If it is required, it counts as missing. |
| Repeated slot | If the same `##` appears twice in a component, the last one wins. |

---

## 2. Languages

The app can be used in Spanish (default) or English, and the backend keeps one Markdown per language: `<id>.es.md` and `<id>.en.md`.

- **Headings** (`# chart`, `## amount at risk`) are the same in both languages: use the English names; the Spanish ones keep working as aliases.
- **Enum values** are the English keys (`critical`, `proposal`, `high`); the Spanish values (`crítica`, `propuesta`, `alta`) are aliases too.
- **Numbers, money and dates** are read in the language of the file: `1.860`, `4,2`, `$579,2 M`, `2 oct 2026, 6:12 a. m.` in `.es.md`, and `1,860`, `4.2`, `$579.2M`, `Oct 2, 2026, 6:12 AM` in `.en.md`. Markdown delivered via `PUT` is read in the language of the UI that sent it.
- **Texts** (titles, notes, assumptions…) are shown as written, so write them in the language of the file.
- Validation messages come in the language of the UI.

---

## 3. How the screen is ordered

**File order does not decide screen order.** Each component has a **zone** and an **order** number in the config:

- The screen draws the zones in the order of the config `zones`.
- Within a zone, components go by `order`.
- Repeatable components of the same type keep their file order.

You can write `# chat` before `# hero` and the screen looks the same. For clarity, follow the order of this table.

| # | Zone (`id`) | Title on screen (en / es) | Components, in order |
|---|---|---|---|
| 1 | `header` | — | `hero` |
| 2 | `what_happened` | What happened / Qué pasó | `hero` summary (paragraph) → `kpi` ×3–4 |
| 3 | `why` | Why / Por qué | `chart` (full width) → `rule` and `cause`, side by side |
| 4 | `proposal` | What I propose / Qué propongo | `action` ×1–3 → `doubt` |
| 5 | `decision` | — (bar fixed at the bottom) | `decision` |
| 6 | `how_i_got_here` | See how I got here / Ver cómo llegué aquí (collapsible, **closed** on load) | `evidence` ×1+ → `calculation` |
| 7 | `log` | Activity log / Bitácora | `log` |
| 8 | `chat` | Floating bubble; opens on tap | `chat` |

Zone titles are translated by the frontend; the `title` in the config is only a fallback. A zone without components is not drawn.

---

## 4. Value types

| Type | How to write it | What it produces | Valid examples |
|---|---|---|---|
| `text` | One line; line breaks are joined with a space. | string | `Coverage` |
| `paragraph` | One or more paragraphs; keeps the breaks. | string | Several lines of text |
| `number` | Format of the file's language (section 2). Takes the **first** number in the text. | number | `4.2` · `1,860` · `−3.5` · `214 customers` (→ 214) |
| `money` | Pesos. `M`, `million` or `millones` multiplies by 1,000,000; `B`, `billion`, `mil millones` or `MM` by 1,000,000,000; `K`, `thousand` or `mil` by 1,000. Without a figure it is 0. | `{ value, text }` | `$579.2M` · `$842,000` · `$579,2 M` · `No direct cost` (→ 0) |
| `boolean` | `yes`, `sí`, `si`, `true`, `1` or `x` are true; anything else is false. | boolean | `yes` · `no` |
| `date` | `Oct 2, 2026, 6:12 AM` or `2 oct 2026, 6:12 a. m.`, time optional, month abbreviated or full. Fixed time zone: Colombia (-05:00). | `{ text, iso }` | `October 14, 2026` · `3 oct 2026, 2:05 p. m.` |
| `enum` | One of the slot options (key or alias), ignoring case and accents. Exact match first, then partial. | `{ value, …option metadata }` | `critical` · `Stockout` · `en análisis` |
| `list` | `- ` or `* ` bullets, one per line. | string[] | `- First assumption` |
| `key_value` | `- key: value` bullets. The key is normalized like slot names. | object | `- sku: 70412` |
| `table` | Markdown table: the first row is the header and the `|---|` row is ignored. Columns take the normalized header as key. | `{ columns: [{key, label}], rows: [{…}] }` | see `chart`, `evidence` |
| `code` | Triple-backtick block with the language. | `{ language, code }` | `sql` |

Notes:

- In tables, `column_aliases` renames columns (`fecha` → `date`), `numeric_columns` turns those cells into numbers (an empty cell is `null`) and `money_columns` turns them into `{ value, text }`.
- A `date` that cannot be read **is not an error**: `iso` is `null` and the text is shown as is.

---

## 5. Supported components

Table conventions: **Req.** = required · **Default** = the slot that receives loose text.

### `# hero` — header · required · once

Template `AlertHero`. Shows severity, type, entity, confidence, title, agent chain, dates, status and the "At risk per month" box. Its `summary` is shown as the **What happened** paragraph; the first sentence (up to the first `. `) is bold.

| Slot | Type | Req. | Aliases | Notes |
|---|---|---|---|---|
| `summary` *(default)* | paragraph | yes | `resumen` | What happened, in 1 or 2 business sentences. |
| `id` | text | yes | | Must match the alert. If not, a warning is added. |
| `title` | text | yes | `titulo`, `titular`, `headline` | Recommended maximum: 140 characters; beyond that, a warning. |
| `severity` | enum | yes | `severidad`, `prioridad`, `priority` | `critical` · `high` · `medium` · `low` |
| `type` | enum | yes | `tipo`, `tema`, `topic` | `stockout` (quiebre de inventario) · `overstock` (sobrestock) · `overdue_receivables` (cartera vencida) · `default_risk` (riesgo de impago) · `low_margin` (margin below policy, margen) · `returns` (devoluciones) · `sales_drop` (caída de ventas) |
| `status` | enum | yes | `estado` | `new` · `analyzing` · `proposal` · `approved` · `rejected` · `executed`. The screen shows the **real** backend status, not this one. |
| `confidence` | enum | yes | `confianza` | `high` · `medium` · `low` |
| `amount_at_risk` | money | yes | `pesos_en_riesgo` | COP per month. It is the total of the decision bar. |
| `risk_note` | text | no | `nota_del_riesgo` | Below the amount, e.g. `≈ 3,448 cases unsold`. |
| `entity` | key_value | yes | `entidad` | Values are joined with ` · `. The `sku` key is shown as `SKU 70412`. |
| `detected_at` | date | yes | `fecha_deteccion` | "Detected …" |
| `updated_at` | date | no | `fecha_actualizacion` | "Updated …" |
| `agents` | key_value | no | `agentes` | Keys `watcher`, `analyst`, `strategist` (or `vigia`, `analista`, `estratega`). Shown as "Watcher detected → Analyst explained → …". |

```markdown
# hero
The back-to-school promotion pushed sales up and Bogotá's inventory only lasts 4 days. If we do nothing…

## id: ALR-1002-017
## title: Vegetable oil 3 L runs out at the Bogotá DC on Oct 6
## severity: critical
## type: stockout
## status: proposal
## confidence: high
## amount at risk: $579.2M
## risk note: ≈ 3,448 cases unsold
## entity:
- product: Vegetable oil 3 L (case of 6)
- sku: 70412
- dc: Bogotá DC – Fontibón
## detected at: Oct 2, 2026, 6:12 AM
## agents:
- watcher: Detected
- analyst: Explained
- strategist: Proposed
```

### `# kpi` — What happened · required · repeatable, 3 to 4

Template `KpiCard`. The cards are drawn in a grid.

| Slot | Type | Req. | Aliases | Notes |
|---|---|---|---|---|
| `label` *(default)* | text | yes | `etiqueta` | |
| `value` | number | yes | `valor` | Shown with the number format of the UI language. |
| `unit` | text | no | `unidad` | `days`, `cases`, `%`… |
| `note` | text | no | `nota` | Small line below the value. |
| `tone` | enum | no | `tono` | `neutral` *(default)* · `critical` (red note) · `positive` (green note) |

```markdown
# kpi
## label: Coverage
## value: 4.2
## unit: days
## note: Minimum 10 days
## tone: critical
```

### `# chart` — Why · required · once

Alias `grafico`. Template `LineChart`: generic line chart.

| Slot | Type | Req. | Aliases | Notes |
|---|---|---|---|---|
| `title` *(default)* | text | yes | `titulo` | |
| `unit` | text | yes | `unidad` | Used in the accessible description. |
| `threshold` | number | no | `umbral` | Dashed policy line. |
| `threshold_label` | text | no | `etiqueta_umbral` | Text above that line. |
| `today` | text | no | `hoy` | Must **equal** a value of the `date` column (ignoring case and accents). The "Today" line is drawn there. |
| `series` | key_value | yes | | `- column: Legend name`. **Order sets the style:** 1st actual (blue), 2nd no action (red dashed), 3rd with the proposal (green). |
| `data` | table | yes | `datos` | The first column **must be `date`** (`fecha` also works): the X axis. The rest are numeric and an empty cell breaks the line. Column names must match the `series` keys. |
| `annotations` | list | no | `anotaciones` | `- Oct 3: text` labels that point. `- Oct 6 – Oct 14: text` shades the range in red. The dates must exist in `date`. |

```markdown
# chart
Coverage in days, Bogotá DC

## unit: days
## threshold: 10
## threshold label: Policy minimum: 10 days
## today: Oct 2
## series:
- actual: Actual
- no_action: If we do nothing
- with_proposal: With the proposal
## data:
| date  | actual | no_action | with_proposal |
|-------|--------|-----------|---------------|
| Oct 1 | 5.1    |           |               |
| Oct 2 | 4.2    | 4.2       | 4.2           |
| Oct 3 |        | 3.2       | 5.9           |
## annotations:
- Oct 3: Transfer arrives
```

### `# rule` — Why · required · once

Alias `regla`. Template `PolicyRule`: "Policy rule broken" card.

| Slot | Type | Req. | Aliases | Notes |
|---|---|---|---|---|
| `text` *(default)* | paragraph | yes | `texto` | The policy text, ideally in “quotes”. |
| `code` | text | yes | `codigo` | E.g. `INV-POL-004 §3.1`. |
| `situation` | text | no | `situacion` | Shown in red: "Today: 4.2 days, 5.8 below the minimum." |

### `# cause` — Why · optional · repeatable, at most 3

Alias `causa`. Template `RelatedCause`. All causes go in **one** "Related causes" card.

| Slot | Type | Req. | Aliases | Notes |
|---|---|---|---|---|
| `details` *(default)* | text | no | `detalle` | Context ("Traditional channel, since Sep 8, 2026"). |
| `type` | text | yes | `tipo` | Shown capitalized, before the details. |
| `title` | text | yes | `titulo`, `entidad`, `entity` | |
| `metric` | text | yes | `metrica`, `metricas`, `metrics` | On the right, e.g. `+30.6% sales`. |

### `# action` — What I propose · required · repeatable, 1 to 3

Alias `accion`. Template `ProposedAction`: card with a checkbox to pick the action.

| Slot | Type | Req. | Aliases | Notes |
|---|---|---|---|---|
| `details` *(default)* | paragraph | yes | `detalle` | |
| `id` | text | yes | | Short and unique (`a1`, `a2`…). Used by `decision.combinations`. |
| `title` | text | yes | `titulo` | |
| `protects` | money | yes | `protege` | What this action protects **on its own**. |
| `cost` | money | yes | `costo` | `No direct cost` is 0 and is shown as is. |
| `cost_concept` | text | no | `concepto_costo` | Shown as "Freight: $9.4M". |
| `confidence` | enum | yes | `confianza` | `high` · `medium` · `low` |
| `quantity` | number | no | `cantidad` | If **any** action has one, the **Edit** button appears to change the quantity before approving. |
| `quantity_label` | text | no | `etiqueta_cantidad` | Label of the editable field ("Cases to transfer"). |
| `selected` | boolean | no | `seleccionada` | Whether the checkbox starts checked. Default `yes`. |
| `assumptions` | list | yes | `supuestos` | |

### `# doubt` — What I propose · optional · once

Alias `duda`. Template `DoubtNotice`: yellow notice starting with **"Where I have doubts:"**. Write it as a normal sentence; the template lowercases the first letter.

| Slot | Type | Req. | Aliases |
|---|---|---|---|
| `text` *(default)* | paragraph | yes | `texto` |

### `# decision` — fixed bar · required · once

Template `DecisionBar`, with the Reject / Edit / Approve buttons. **No default slot:** everything goes in `##`.

| Slot | Type | Req. | Aliases | Notes |
|---|---|---|---|---|
| `combinations` | table | yes | `combinaciones` | Columns `actions` and `protects` (or `acciones` and `protege`); `protects` is read as money. Ids joined with `+`, in any order. It is the **real** protection of each combination, which is not always the sum. If a combination is missing, the sum capped at `amount_at_risk` is used. |
| `rejection_reasons` | list | yes | `motivos_rechazo` | **The last one** is treated as "Other reason" and requires writing the details. |

```markdown
# decision
## combinations:
| actions | protects |
|---------|----------|
| a1      | $201.6M  |
| a2      | $415.8M  |
| a1+a2   | $579.2M  |
## rejection reasons:
- The data is wrong
- It costs more than it protects
- Other reason
```

### `# evidence` — See how I got here · required · repeatable, at least 1

Alias `evidencia`. Template `Evidence`: data table. Numbered automatically ("Evidence 1", "Evidence 2"…).

| Slot | Type | Req. | Aliases | Notes |
|---|---|---|---|---|
| `description` *(default)* | paragraph | no | `descripcion` | |
| `title` | text | yes | `titulo` | |
| `highlight` | text | no | `destacar` | Bolds the row whose **first cell starts** with this text. |
| `table` | table | yes | `tabla` | Cells are shown as text, with their own format. Columns with only numbers or percentages are right-aligned. |
| `sql` | code | yes | | `sql` block with the query that produced the table. It is read and validated but not shown on screen for now. |

### `# calculation` — See how I got here · optional · once

Alias `calculo`. Template `CalculationNote`. Shown as "Risk calculation: {formula} Rule applied: {rule_version}."

| Slot | Type | Req. | Aliases |
|---|---|---|---|
| `formula` *(default)* | paragraph | yes | |
| `rule_version` | text | no | `version_regla` |

### `# log` — Activity log · required · once

Alias `bitacora`. Template `Timeline`. **No default slot.** Decisions taken in the app are added at the end automatically; you do not write them.

| Slot | Type | Req. | Aliases | Notes |
|---|---|---|---|---|
| `events` | table | yes | `eventos` | Columns `date`, `who` and `event`, plus an optional `status` (`proposal` paints the dot blue). The Spanish columns `fecha`, `quien`, `evento`, `estado` also work. |

### `# chat` — floating bubble · optional · once

Template `AlertChat`. **No default slot.**

| Slot | Type | Req. | Aliases | Notes |
|---|---|---|---|---|
| `suggested_questions` | list | no | `preguntas_sugeridas` | At most 4; more adds a warning. |

---

## 6. Validation: errors and warnings

Every delivery is validated against the config:

- **Errors:** the file is **not published**. Via the API it answers `422`.
- **Warnings:** it is published anyway, but they should be fixed.

**Errors** (shown in the language of the UI)

| Message (shape) | Cause |
|---|---|
| `Line N: the component "# x" does not exist in the config.` | Unknown component name. |
| `Line N: "# x" has no slot "## y".` | Unknown slot for that component. |
| `Line N: "value" is not a valid option of "slot" in "# x".` | An `enum` with no matching option. |
| `Line N: "value" is not a valid number for "slot" in "# x".` | A `number` without a figure. |
| `Line N: "# x" is missing the required slot "## y".` | A required slot is missing or empty. |
| `The required component "# x" is missing.` | `hero`, `kpi`, `chart`, `rule`, `action`, `decision`, `evidence` or `log` is missing. |
| `"# x" appears N times and only one is allowed.` | A non-repeatable component was repeated. |
| `"# x" needs at least N (there are M).` / `allows at most N (there are M).` | Count out of range (`kpi` 3–4, `action` 1–3, `cause` ≤3, `evidence` ≥1). |

**Warnings:** loose text in a component without a default slot · `title` longer than 140 characters · more than 4 suggested questions · `## id` different from the requested alert.

**Not validated yet** (be careful when writing):

- That `today` and the `annotations` dates exist in the chart table. If they do not, they are not drawn.
- That the `series` keys match `data` columns.
- That the `combinations` ids exist among the `action`s.
- That `log` has the `date`, `who` and `event` columns.
- That a `date` is readable (`iso` stays `null`).

---

## 7. Minimal template to copy

It has only the required components and slots; it passes validation as is.

````markdown
# hero
[What happened, in 1–2 business sentences.]

## id: [ALR-MMDD-NNN]
## title: [One sentence with the problem]
## severity: [critical | high | medium | low]
## type: [stockout | overstock | overdue_receivables | default_risk | low_margin | returns | sales_drop]
## status: proposal
## confidence: [high | medium | low]
## amount at risk: [$0.0M]
## entity:
- [key]: [value]
## detected at: [Oct 2, 2026, 6:12 AM]


# kpi
## label: [Indicator 1]
## value: [0]

# kpi
## label: [Indicator 2]
## value: [0]

# kpi
## label: [Indicator 3]
## value: [0]


# chart
[Chart title]

## unit: [days]
## series:
- actual: Actual
## data:
| date | actual |
|------|--------|
| [Oct 1] | [0] |
| [Oct 2] | [0] |


# rule
“[Policy text]”

## code: [POL-000 §0.0]


# action
[What the action does.]

## id: a1
## title: [Proposed action]
## protects: [$0.0M]
## cost: [No direct cost]
## confidence: [high | medium | low]
## assumptions:
- [Assumption]


# decision
## combinations:
| actions | protects |
|---------|----------|
| a1 | [$0.0M] |
## rejection reasons:
- The data is wrong
- Other reason


# evidence
## title: [What the table shows]
## table:
| [Column] | [Value] |
|----------|---------|
| [a] | [1] |
## sql:
```sql
SELECT …;
```


# log
## events:
| date | who | event |
|------|-----|-------|
| [Oct 2, 2026, 6:12 AM] | Watcher | [What it detected] |
````

---

## 8. Where the file is delivered

The backend looks for an alert's Markdown in this order and uses the first one it finds:

1. **API delivery:** `PUT /api/alerts/:id/detail` with the Markdown as the body (`Content-Type: text/markdown`). This is what the "Agent Markdown · test mode" panel of the detail screen does. `DELETE` on the same route discards it.
2. **File:** `server/agent/alerts/<ID>.<lang>.md` in the UI language (`es` or `en`); if it does not exist, the other language's file is used. It is read again every time the detail opens, so no restart is needed.
3. **Generated:** if there is none, the simulated Strategist ([server/markdownGenerator.ts](../server/markdownGenerator.ts)) writes one from the alert data, in the UI language.

While the alert is in `new` or `analyzing`, no file is looked up or generated, and the screen shows "I am analyzing this alert". An API delivery is shown even while the alert is still being analyzed.

---

## 9. Adding a component or a slot

1. **Config.** In `components` of `centinela.config.json`, define:
   - `render`: the template name.
   - `zone` and `order`.
   - `required` and `repeatable`, with `min` and `max` if needed.
   - `default_slot`, and `alias` if it should accept other names.
   - `slots`, each with its `type` and, if needed, `required`, `alias`, `options`, `default` or `field` (path in the output `alert` object, e.g. `threshold.text`).
   - If the component is repeatable, `collection`: the list name in `alert`.
2. **Template.** Register the `render` in `RENDERS` of [blocks.tsx](../src/components/detail/blocks.tsx). If repeated items should go together in one container, register it in `GROUPS`. Put any UI text in [src/i18n/es.ts](../src/i18n/es.ts) and [src/i18n/en.ts](../src/i18n/en.ts).
3. **New zone**, if needed: add it to the config `zones` with `id` and `title` (and `collapsible: true` if it should open and close), and its translated title in `detail.zones` of both dictionaries.

If a component that is valid in the config arrives without a registered template, the screen does not fail: it shows it in a "Component without a template" box with its data.

For a **new slot** in an existing component, adding it to the config is enough. The template receives it in `data`, but it only shows if the template uses it.

---

## 10. Common mistakes

| Symptom | Cause | Fix |
|---|---|---|
| `"## value" is not a valid number` | `four point two` or `—` was written. | Use figures: `4.2` (or `4,2` in a Spanish file). |
| `1,860` is read as 1.86 | It is in a Spanish file, where `,` is the decimal separator. | Use the format of the file's language (section 2). |
| The chart has no "Today" line | `## today: Oct. 2` does not match the `Oct 2` cell. | Copy the exact value of the `date` column. |
| A series does not show | The key in `series` (`no action`) does not match the column (`no_action`). | Use the same name; spaces count as `_`, so `no action` and `no_action` match, but `noaction` does not. |
| `$579.2` is read as 579 pesos | The `M` is missing. | Write `$579.2M`. |
| The decision bar shows the sum, not the real value | That combination is missing from `combinations`. | Add the row with the ids joined by `+`. |
| `## selected: yes` does not check the box | — | It does: `yes`, `sí`, `si`, `x`, `1` and `true` all work. Any other word leaves it unchecked. |
| The SQL breaks the file | The code block is not closed. | Always close the block with three backticks. |
