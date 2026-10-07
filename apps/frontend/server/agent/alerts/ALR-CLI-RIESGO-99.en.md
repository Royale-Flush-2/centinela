# hero
Alerta detectada para el cliente CLI-RIESGO-99.

## id: ALR-CLI-RIESGO-99
## title: Anomalía en cliente CLI-RIESGO-99
## severity: high
## type: overdue_receivables
## status: proposal
## confidence: high
## amount at risk: $15000000.0
## entity:
- client: CLI-RIESGO-99
## detected at: 2026-10-03


# chart
- revenue_at_risk: 15000000.0
- margin: 0.0

# kpi
- alert_id: ALR-CLI-RIESGO-99
- category: unknown
- baseline_margin: 0.0
- affected_revenue: 15000000.0
- policy_context: Not provided

# evidence
- alert category is unknown and root cause is blank; treat as undiagnosed anomaly requiring triage.
- margin baseline is 0.0, so any incremental cost must be justified by preserving revenue or unlocking margin recovery.
- affected revenue is 15,000,000.0, indicating high materiality.
- past rejection service unavailable: avoid assumptions based on historical rejection patterns.

# action
## id: A1
## title: Immediate manual underwriting and exposure review for CLI-RIESGO-99
## protects: revenue_at_risk (15,000,000.0) and downside margin exposure
## cost: 2,500 - 7,500 (approx. 6-20 analyst hours)
## confidence: 0.62
## assumptions:
- A small specialist team can review the account and determine whether the anomaly is pricing, credit, fraud, or operational in origin.
- A 24-72 hour manual review is acceptable before automated policy changes are made.
- The 15,000,000.0 revenue is worth preserving, even if current margin is 0.0.

# action
## id: A2
## title: Temporary risk-based hold on new commitments until root cause is resolved
## protects: prevents further revenue-at-risk expansion beyond 15,000,000.0
## cost: potential delay cost and customer friction; estimated 0.5-2.0% of affected revenue per week (75,000 - 300,000)
## confidence: 0.55
## assumptions:
- New commitments may increase exposure while the alert remains undiagnosed.
- A short operational hold will not irreversibly damage the client relationship.
- The policy constraints are strict enough to justify containment over growth.

# action
## id: A3
## title: Run targeted diagnostic controls and reconcile revenue with margin and policy rules
## protects: decision quality and prevents mispricing/incorrect categorization
## cost: 1,000 - 5,000 in tooling/analyst time
## confidence: 0.70
## assumptions:
- The unknown category can be reduced to a known failure mode by checking policy rules, pricing, transaction integrity, and revenue recognition.
- Baseline margin of 0.0 may be caused by missing cost allocation, misposting, or offsetting items rather than true zero profitability.
- Reconciliation can be completed without full production changes.

# action
## id: A4
## title: Senior risk committee escalation with pre-approved intervention thresholds
## protects: governance, accountability, and rapid execution if manual review confirms material loss
## cost: 500 - 1,500 plus executive time
## confidence: 0.68
## assumptions:
- The alert is material enough to warrant senior oversight because affected revenue is 15,000,000.0.
- Escalation can be paired with clear pre-approved actions, such as A1 and A2, to avoid delays.
- No past rejection history is available, so the committee should not rely on historical policy precedent.

# decision
## combinations:
| combination | actions | rationale |
|---|---|---|
| C1 | A1 + A3 | Best first-pass approach: diagnose with targeted controls while manually reviewing the account; preserves option value and minimizes blind policy changes. |
| C2 | A1 + A2 + A3 | Strongest containment: adds temporary hold to prevent exposure growth while diagnosis and review proceed. |
| C3 | A1 + A3 + A4 | Governance-heavy path: escalates to risk committee for materiality while diagnosis and manual review continue. |
| C4 | A2 + A4 | Fast escalation and containment if the anomaly appears systemic or time-sensitive, but weaker on root-cause diagnosis. |

## rejection reasons:
- A2 alone: Rejected because a hold without diagnosis may create unnecessary customer friction and does not resolve the root cause.
- A3 alone: Rejected because diagnostic work alone does not immediately protect the 15,000,000.0 revenue at risk.
- A4 alone: Rejected because escalation without operational containment or diagnosis delays measurable risk reduction.
- A1 + A2: Partially rejected because it contains and reviews, but lacks the diagnostic reconciliation needed to classify the unknown category.
- A2 + A3 + A4: Rejected as the preferred path because it omits direct manual underwriting, which is important for a high-materiality but root-cause-blind alert.
- Any combination relying on historical rejection data: Rejected because the past rejection service was unavailable and no historical rejection basis can be assumed.
