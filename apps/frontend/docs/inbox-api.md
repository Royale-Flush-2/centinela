# Decision Inbox API (Centinela)

Contract between the Inbox frontend and the backend. Today it is fulfilled by a mock backend ([server/](../server/)) mounted inside Vite; a real backend must respect the same routes, parameters and response shapes so the frontend works unchanged.

- Reference types (source of truth): [src/domain.ts](../src/domain.ts)
- Mock implementation: [server/api.ts](../server/api.ts), [server/store.ts](../server/store.ts), [server/semantic.ts](../server/semantic.ts)
- Frontend client: [src/api.ts](../src/api.ts)

## Contents

1. [Conventions](#1-conventions)
2. [Catalogs](#2-catalogs)
3. [`Alert` model](#3-alert-model)
4. [`GET /api/alerts` — list with search and filters](#4-get-apialerts)
5. [`GET /api/summary`](#5-get-apisummary)
6. [`GET /api/events` — notifications](#6-get-apievents)
7. [Actions (`POST`)](#7-actions-post)
8. [Errors](#8-errors)
9. [What the real backend should add](#9-what-the-real-backend-should-add)

---

## 1. Conventions

| Topic | Rule |
|---|---|
| Base | Every route hangs from `/api`. |
| Format | UTF-8 JSON (`Content-Type: application/json; charset=utf-8`). |
| Cache | `Cache-Control: no-store` on every response: the inbox changes within seconds. |
| Language | The frontend sends `Accept-Language: es` or `en` (the language picked in the UI, Spanish by default). Every user-facing text in the response (`headline`, `typeLabel`, agent Markdown, `error`…) comes back in that language. Anything that is not `en` is treated as `es`. |
| Money | **Integer** Colombian pesos, unformatted: `579200000`. The frontend shows it as `$579,2 M` (es) or `$579.2M` (en). |
| Dates | ISO 8601 **with time zone**: `2026-10-02T08:10:00-05:00`. The frontend formats them per language. |
| Enumerations | Always the lowercase English key (`critical`, `analyzing`). Display texts live in the frontend dictionaries ([src/i18n/](../src/i18n/)). |
| Lists in the URL | Comma-separated values: `topic=inventory,receivables`. |
| Names | Fields in English and `camelCase`, as in `src/domain.ts`. |

---

## 2. Catalogs

The backend must accept and return **exactly** these keys.

**Priority** (called `severity` in the model)

| Key | Label (es / en) | Sort weight |
|---|---|---|
| `critical` | Crítica / Critical | 4 |
| `high` | Alta / High | 3 |
| `medium` | Media / Medium | 2 |
| `low` | Baja / Low | 1 |

**Status**

| Key | Label (es / en) | Pending? | Can be approved or rejected |
|---|---|---|---|
| `new` | Nueva / New | yes | no |
| `analyzing` | En análisis / Analyzing | yes | no |
| `proposal` | Propuesta lista / Proposal ready | yes | **yes** |
| `approved` | Aprobada / Approved | no | no |
| `rejected` | Rechazada / Rejected | no | no |
| `executed` | Ejecutada / Executed | no | no |

**Topic** (alert category)

| Key | Label (es / en) |
|---|---|
| `inventory` | Inventario / Inventory |
| `receivables` | Cartera / Receivables |
| `margin` | Margen / Margin |
| `returns` | Devoluciones / Returns |
| `sales` | Ventas / Sales |

**View** (selector to the left of the search bar)

| Key | Label (es / en) | Statuses it includes |
|---|---|---|
| `pending` *(default)* | Pendientes / Pending | `new`, `analyzing`, `proposal` |
| `approved` | Aprobadas / Approved | `approved` |
| `rejected` | Rechazadas / Rejected | `rejected` |
| `executed` | Ejecutadas / Executed | `executed` |
| `all` | Todas / All | all six |

**Confidence:** `high` · `medium` · `low`

**Sort:** `amount` *(default)* · `severity` · `recent` · `relevance`

---

## 3. `Alert` model

This is what an alert looks like in any response. Every field is required unless stated otherwise. Texts come in the requested language.

| Field | Type | Description | Where the card uses it |
|---|---|---|---|
| `id` | string | Stable identifier. Current format `ALR-MMDD-NNN`. | Detail and aria |
| `severity` | `critical\|high\|medium\|low` | Priority. | Colored chip and icon |
| `confidence` | `high\|medium\|low` | How sure the agent is. | Chip with bars |
| `status` | Status | See catalog. | Status chip; enables Approve and Reject only on `proposal` |
| `topic` | Topic | Category; it is what the **Topic** filter filters. | — |
| `typeLabel` | string | Name of the alert type, ready to show. | "Stockout" |
| `entityLabel` | string | What is affected (product, customer, route…) and where. | "Vegetable oil 3 L · Bogotá DC" |
| `headline` | string | One sentence explaining the problem. | Card title |
| `description` | string | Context and agent proposal. | Detail |
| `amountAtRisk` | integer | Pesos at risk per month. | `$579,2 M` |
| `createdAt` | ISO 8601 | When it was detected. | "since Oct 2, 2026" and the `recent` sort |
| `agent` | string \| null | What the agent is doing right now; `null` if no work is in progress. | Blue line with a spinner |
| `series` | `Series` | Sparkline data. | Sparkline |

**`Series`**

| Field | Type | Description |
|---|---|---|
| `label` | string | Name of the indicator ("Coverage", "Days overdue"). |
| `unit` | `""` \| `"%"` \| `"days"` | How the last value is formatted: `47`, `21.4%`, `4.2 days`. |
| `values` | number[] | Chronological series, oldest to newest. 14 points recommended (minimum 2). The last value is the one shown. |
| `threshold` | number | Policy value; drawn as a dashed line. |
| `thresholdType` | `min` \| `max` | Whether the policy requires staying above (`min`) or below (`max`). |
| `summary` | string | Accessible sentence for screen readers, e.g. "Coverage: fell from 14.5 to 4.2 days; the minimum is 10". |

> The backend does **not** send SVG points, colors or pre-formatted amounts (`$579,2 M`): the frontend computes them from the numbers.

---

## 4. `GET /api/alerts`

Returns the inbox alerts according to the view, the semantic search, the filters and the sort.

### 4.1 Parameters (query string)

| Parameter | Type | Default | Description |
|---|---|---|---|
| `view` | View | `pending` | Base set of statuses (see catalog). |
| `q` | string | — | Natural-language search, in Spanish or English ("clientes que no pagan", "customers who don't pay"). Empty means no search. |
| `topic` | list of Topic | — | Values of the **Topic** filter. |
| `topic_op` | `is` \| `is_not` | `is` | Operator of the Topic filter. |
| `status` | list of Status | — | Values of the **Status** filter. |
| `status_op` | `is` \| `is_not` | `is` | Operator of the Status filter. |
| `priority` | list of Priority | — | Values of the **Priority** filter; compared with the `severity` field. |
| `priority_op` | `is` \| `is_not` | `is` | Operator of the Priority filter. |
| `sort` | Sort | `amount` | Sort criterion. |

The frontend only sends a filter if it has at least one value, and only sends `*_op` when it is `is_not`.

### 4.2 How they combine

The backend applies the steps in this order:

1. **View:** only alerts whose `status` belongs to the view.
2. **Semantic search** (if `q` is not empty): `relevance` (0 to 1) is computed for each alert and the ones below the threshold (**0.25** in the mock) are dropped.
3. **Filters:**
   - Within one filter, values combine with **OR**: `topic=inventory,receivables` lets through inventory or receivables alerts.
   - Across filters they combine with **AND**: `topic=receivables&priority=high` requires both.
   - With `*_op=is_not` the filter is inverted: `priority=low&priority_op=is_not` keeps everything that is **not** low.
   - The Status filter can only narrow within the view; it does not widen it.
4. **Sort:**

| `sort` | Criterion | Tie-break |
|---|---|---|
| `amount` | `amountAtRisk`, highest first | — |
| `severity` | Priority weight, highest first | `amountAtRisk` |
| `recent` | `createdAt`, newest first | — |
| `relevance` | `relevance`, highest first | `amountAtRisk` |

   If `sort=relevance` arrives without `q`, it sorts by `amount`.

### 4.3 From the bar to the URL

| What the user sees in the bar | Request |
|---|---|
| Pending view, no filters | `GET /api/alerts?view=pending&sort=amount` |
| `Topic is Inventory, Receivables` | `…&topic=inventory,receivables` |
| `Priority is not Low` | `…&priority=low&priority_op=is_not` |
| Suggestion "What I can approve today" | `…?view=pending&status=proposal&sort=amount` |
| Text "customers who don't pay" | `…&q=customers%20who%20don't%20pay&sort=relevance` |
| All together | `/api/alerts?view=all&q=running%20out%20of%20stock&topic=inventory&priority=low&priority_op=is_not&sort=relevance` |

### 4.4 Response `200`

```jsonc
{
  "alerts": [ /* AlertResult[] already filtered and sorted */ ],
  "total": 2,          // alerts returned by this query
  "viewTotal": 4,      // alerts in the view, without q or filters
  "facets": {
    "topic":    [{ "value": "inventory", "count": 0 }, …],
    "status":   [{ "value": "analyzing", "count": 1 }, …],
    "priority": [{ "value": "high", "count": 1 }, …]
  }
}
```

**`AlertResult`** is an `Alert` with two fields that only come when there is a `q`:

| Field | Type | Description |
|---|---|---|
| `relevance` | number (0–1, two decimals) | Similarity between the search and the alert. |
| `matches` | string[] | Concepts explaining the match, in readable text in the requested language ("receivables and payments", "Bogotá"). The card shows "Matches on …". May be empty. |

**`facets` rules** (they feed the options and counts of each filter menu):

- Each facet lists **every** possible value, even with `count: 0`, in catalog order.
- `facets.status` only includes the statuses of the current view.
- The count of a filter is computed applying the view, `q` and **the other filters, but not its own**. That way the user sees how many alerts another option would add.
- Labels are not sent: the frontend translates each `value`.

**Result line** the frontend builds with this data:

- No search or filters: `{viewTotal} pending alerts · sorted by …`
- With search or filters: `{total} alerts match out of {viewTotal} pending alerts`

<details>
<summary>Real example: <code>?view=pending&q=customers who don't pay&priority=low&priority_op=is_not&sort=relevance</code> with <code>Accept-Language: en</code></summary>

```json
{
  "alerts": [
    {
      "id": "ALR-0930-008",
      "severity": "high",
      "confidence": "medium",
      "status": "proposal",
      "topic": "receivables",
      "typeLabel": "Overdue receivables",
      "entityLabel": "Autoservicio El Progreso · Cali",
      "headline": "Autoservicio El Progreso is 47 days overdue and keeps buying on credit",
      "description": "The customer owes 3 overdue invoices and opened 2 new credit orders this week. Proposal: freeze the credit line and switch to cash payment until the debt is normalized.",
      "amountAtRisk": 186400000,
      "createdAt": "2026-09-30T10:25:00-05:00",
      "agent": null,
      "series": {
        "label": "Days overdue",
        "unit": "",
        "values": [12, 14, 15, 18, 20, 22, 25, 27, 30, 33, 36, 40, 43, 47],
        "threshold": 30,
        "thresholdType": "max",
        "summary": "Days overdue: rose from 12 to 47; the maximum is 30"
      },
      "relevance": 0.75,
      "matches": ["customers", "receivables and payments"]
    }
  ],
  "total": 2,
  "viewTotal": 4,
  "facets": {
    "topic": [
      { "value": "inventory", "count": 0 },
      { "value": "receivables", "count": 1 },
      { "value": "margin", "count": 1 },
      { "value": "returns", "count": 0 },
      { "value": "sales", "count": 0 }
    ],
    "status": [
      { "value": "new", "count": 0 },
      { "value": "analyzing", "count": 1 },
      { "value": "proposal", "count": 1 }
    ],
    "priority": [
      { "value": "critical", "count": 0 },
      { "value": "high", "count": 1 },
      { "value": "medium", "count": 1 },
      { "value": "low", "count": 0 }
    ]
  }
}
```

(`alerts` was trimmed to one item; `total` is 2.)
</details>

---

## 5. `GET /api/summary`

Feeds the "At risk this month" card, the subtitle and the Inbox tab counter. Always computed over the **pending** alerts, ignoring filters.

```json
{
  "amountAtRisk": 838700000,
  "bySeverity": { "critical": 1, "high": 1, "medium": 1, "low": 1 },
  "pending": 4,
  "ready": 2,
  "inProgress": 2,
  "lastCheck": "2026-10-03T04:22:35.846Z"
}
```

| Field | Description |
|---|---|
| `amountAtRisk` | Sum of `amountAtRisk` of the pending alerts. |
| `bySeverity` | Number of pending alerts per priority; always has the 4 keys. |
| `pending` | Total pending alerts; it is the tab counter and the page title counter. |
| `ready` | Alerts in `proposal` ("2 proposals ready to decide"). |
| `inProgress` | Alerts in `new` or `analyzing` ("and 2 in progress"). |
| `lastCheck` | Time of the agents' last pass ("Agents active · last check 9:40 AM"). |

---

## 6. `GET /api/events`

Source of the notifications. The frontend polls it **every 2.5 s**.

| Parameter | Description |
|---|---|
| `since` *(optional)* | Last `seq` the client already saw. Without it the response has `events: []` and only the cursor, so a freshly opened client gets no old notifications. |

```json
{
  "events": [
    { "seq": 1, "type": "new", "alert": { /* full Alert */ }, "at": "2026-10-03T04:22:36.621Z" }
  ],
  "last": 1,
  "revision": 2
}
```

| Field | Description |
|---|---|
| `events[].seq` | Unique, increasing sequence. |
| `events[].type` | `new`: an alert was detected. `ready`: the alert moved to `proposal` and can now be decided. |
| `events[].alert` | Snapshot of the alert at the time of the event, in the requested language; the toast and the browser notification are built from it. |
| `last` | Highest `seq` so far; the client sends it as `since` on the next poll. |
| `revision` | Counter that goes up with **any** data change: new alerts, agent progress or a decision. If it changes, the frontend reloads `/alerts` and `/summary`. |

This route has no simulated latency and must answer fast, since it is polled very often.

---

## 7. Actions (`POST`)

### `POST /api/alerts/:id/approve` and `POST /api/alerts/:id/reject`

Only allowed when the alert is in `proposal`.

- `200`: returns the `Alert` with `status` set to `approved` or `rejected` and `agent: null`, and bumps `revision`.
- `404`: the alert does not exist.
- `409`: the alert is not in `proposal`.

Optional body, sent by the detail screen (the inbox card sends none):

- Approve: `{ "actions": [{ "id": "a1", "quantity": 1200 }], "protects": 579200000 }`. If `actions` arrives empty it answers `400`.
- Reject: `{ "reason": "It costs more than it protects", "details": "free text" }`.

The decision is stored and returned by `GET …/detail` inside `decision`; the activity log shows it as one more event.

### Alert detail (agent Markdown)

The Strategist agent delivers the detail as Markdown. The backend reads it with [server/agent/centinela.config.json](../server/agent/centinela.config.json): each `# component` says which template is used and each `## slot:` which field is filled. The format is described in [agent-markdown-format.md](agent-markdown-format.md); the reference example is [server/agent/alerts/ALR-1002-017.en.md](../server/agent/alerts/ALR-1002-017.en.md) (Spanish version: [ALR-1002-017.es.md](../server/agent/alerts/ALR-1002-017.es.md)).

| Route | Description |
|---|---|
| `GET /api/alerts/:id/detail` | Returns `{ alert, ready, source, markdown, result, decision }`. `ready: false` while the alert is in `new` or `analyzing`. `result` is the reader output: `{ ok, errors, warnings, alert, view }`, and `view` lists the zones with their components in order. |
| `PUT /api/alerts/:id/detail` | Body: the Markdown as plain text (`Content-Type: text/markdown`). Simulates an agent delivery. Answers `200` if it passes validation and `422` with `result.errors` if not. |
| `DELETE /api/alerts/:id/detail` | Discards the `PUT` delivery and goes back to the file or the generated Markdown. |

`source` says where the Markdown came from, in this priority order:

1. `manual`: what arrived via `PUT`.
2. `file`: `server/agent/alerts/<id>.<lang>.md` in the requested language, or the other language if that one does not exist.
3. `generated`: written by the simulated Strategist (`server/markdownGenerator.ts`) in the requested language.

The frontend draws each component by its `render` (`AlertHero`, `KpiCard`, `LineChart`…), registered in [src/components/detail/blocks.tsx](../src/components/detail/blocks.tsx). If a `render` without a template arrives, it is shown in a warning box instead of failing.

### `POST /api/alerts/simulate` *(testing only)*

Used by the "Simulate alert" button. The body is optional: `{ "severity": "critical" }`.

- `201`: returns the created `Alert` in `new` status and records a `new` event.
- Afterwards the alert moves through the agents on its own:

| Time | `status` | `agent` (en) |
|---|---|---|
| 0 s | `new` | Queued for the Analyst |
| 5 s | `analyzing` | Analyst reviewing … · step 1 of 3 |
| 10 s | `analyzing` | Analyst checking data against the policies · step 2 of 3 |
| 16 s | `analyzing` | Strategist preparing the proposal · step 3 of 3 |
| 22 s | `proposal` | `null`, and the `ready` event is recorded |

In a real backend this route should not exist in production: the agents generate the events.

---

## 8. Errors

Every error answers with the matching HTTP code and this body:

```json
{ "error": "The alert is \"New\" and has no proposal to decide" }
```

| Code | When |
|---|---|
| `400` | Invalid JSON body, or an empty `actions` list on approve. |
| `404` | Unknown route or alert. |
| `409` | Decision on an alert that is not in `proposal`. |
| `422` | Agent Markdown that fails validation (`PUT …/detail`). |
| `500` | Internal error. |

The `error` text is shown as is in the frontend toast, so it must be in the requested language and make sense without more context.

Parameter validation in the mock: unknown values in `view`, `sort`, filters and `*_op` **are ignored** and the defaults are used, with no error. Recommendation for the real backend in section 9.

---

## 9. What the real backend should add

The above is what the frontend uses **today**. The following is not in the mock yet and the frontend does not need it to work, but a real backend should consider it. If added, do it compatibly: only new, optional fields.

| Topic | What it should do | Why |
|---|---|---|
| **Real semantic search** | Use embeddings of `headline + typeLabel + entityLabel + description` and compute cosine similarity against the query. Keep `relevance` normalized between 0 and 1 and document the threshold. | The mock only crosses fixed synonyms. |
| **Useful `matches`** | Return 1 to 3 short phrases explaining why it matched (concepts or fields). | It is what the card shows in "Matches on …". |
| **Pagination** | `limit` (default 50) and `cursor`; answer `nextCursor`. `total` and `facets` always over the full set, not the page. | Today everything is returned. |
| **Strict validation** | Answer `400` with `error` when a value outside the catalog arrives, instead of ignoring it. | Helps catch integration bugs. |
| **Decision audit** | Store and return `decidedBy` (user) and `decidedAt` (ISO). | Base for the History screen. |
| **Concurrency** | If two people decide the same alert, the second one gets `409`. Optionally accept an `Idempotency-Key`. | Avoids approving twice. |
| **Policy threshold** | Include a `policyId` (e.g. `INV-POL-004`) in `series` next to `threshold`. | The design already plans a "Policy broken" filter. |
| **Real-time notifications** | Optional: `GET /api/events/stream` with Server-Sent Events and the same event format. Polling must keep working. | Less latency and fewer requests. |
| **Authentication and scope** | Every route authenticated; `summary` and `alerts` limited to the user's region or team. | The original design shows the user as "Sales manager · Central Region". |
| **More filters from the design** | If Confidence, Amount at risk, DC, Region, Channel or Date are added, follow the same pattern: `field=a,b&field_op=is_not` and an entry in `facets`. For ranges (amount, date) use `amount_min`, `amount_max`, `from`, `to`. | That way the bar can grow without changing the contract. |
