# Uncertainty Engine -- the AI Honesty Layer

Design document for the Rafters platform service that records, calibrates, and audits AI predictions across every studio surface.

**Status:** Spike
**Author:** platform
**Date:** 2026-04-26

---

## Context

Every Rafters surface that calls a model produces predictions: rafters names colors, eavesdrop classifies signals, mail scores delivery viability, ctrl scores decision quality. Each surface has its own confidence story and no shared ledger. There is no way to ask "when this model said 80%, was it right 80% of the time?" across the studio.

The ezmode lineage carried a `UncertaintyClient` in rafters that posted predictions to a `CORE_API` service binding. The server side never existed. The client was non-blocking by design -- silent failure, no gating. The shape of that client is the right shape: observe, don't decide. Build the server side fresh on platform.

**Positioning:** The platform does not build models. The platform audits them. Other agents own naming, classification, scoring. Platform owns the receipt trail and the calibration math. The engine produces a single posture: every confidence number Rafters publishes is grounded in a published reliability record.

---

## The institutional read

The uncertainty engine is the **asymmetry of knowing** applied to machine output. Same ethic the platform already holds for revenue (publish the algorithm) and for permissions (the math is too simple to game). When AI returns a number, the platform's question is not "is the model good" but "what does this number mean in our hands."

Three institutional commitments fall out of that posture:

1. **Predictions are events, not opinions.** A prediction is recorded with the same rigor as a money transfer -- inputs, model, version, claimed confidence, timestamp. Surfaces emit; platform stores. No silent loss.
2. **Outcomes are first-class.** A prediction without a witnessed outcome is not a failure -- it is a state. Most predictions never get explicit feedback. The engine names that state and counts it.
3. **Calibration is published.** Reliability diagrams (and the underlying counts) are queryable, eventually public. The same instinct as "publish the revenue split." Trust comes from auditability, not from claims.

---

## Lifecycle of a prediction

Five states. Mirrors the lifecycle of a dollar.

| State        | Trigger                                                                               | Notes                                                       |
| ------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `emitted`    | Surface POSTs a prediction with input fingerprint, model, version, claimed confidence | Default state at write                                      |
| `witnessed`  | Surface PUTs an outcome (accepted, rejected, edited, ignored, custom)                 | Outcome shape is per-surface; engine stores the label only  |
| `calibrated` | Joined to a reliability cohort `(surface, model, version, confidence_bucket)`         | Background job; updates Brier and reliability diagram cache |
| `orphaned`   | No outcome witnessed within `T` (per-surface configurable, default 30 days)           | Counted separately; not poisoned into the calibration       |
| `retired`    | Model version superseded; predictions move to archive cohort                          | Kept for historical drift analysis                          |

The orphan state is load-bearing. The wrong design is to treat silence as agreement (poisons calibration upward) or as disagreement (poisons it downward). Silence is its own state, surfaced as a metric -- "76% of color names are accepted without edit, 4% rejected, 20% never witnessed." That third number is itself a signal about the surface.

---

## Schema

One D1 table covers emit + witness. Calibration is computed from queries, cached in a second table.

### `uncertainty_prediction`

| Column                | Type                      | Purpose                                                                                          |
| --------------------- | ------------------------- | ------------------------------------------------------------------------------------------------ |
| `id`                  | text (uuidv7)             | Primary key                                                                                      |
| `surface`             | text                      | `rafters.color`, `eavesdrop.classify`, `mail.deliverability`, `ctrl.decision`                    |
| `feature_key`         | text                      | Stable identifier for the input shape (e.g. `oklch.lowChromaHighLightness`, `email.cold-domain`) |
| `input_fingerprint`   | text                      | Hash of the canonical input. For dedup and drift cohorts                                         |
| `model`               | text                      | `claude-sonnet-4-7`, `kimi-k2`, `qwen3-coder`                                                    |
| `model_version`       | text                      | Provider's version string at call time                                                           |
| `claimed_confidence`  | real                      | The number the model (or surface) attached to the prediction. 0.0 - 1.0                          |
| `prediction_payload`  | text (JSON)               | What the model returned. Surface-shaped                                                          |
| `state`               | text                      | `emitted` \| `witnessed` \| `orphaned` \| `retired`                                              |
| `outcome_label`       | text \| null              | Per-surface enum: `accepted`, `rejected`, `edited`, `ignored`, `custom`                          |
| `outcome_payload`     | text (JSON) \| null       | Optional detail (the edited name, the rejection reason)                                          |
| `outcome_correctness` | real \| null              | 0.0 - 1.0. Surface decides the mapping. `accepted` -> 1.0, `rejected` -> 0.0, `edited` -> 0.5    |
| `created_at`          | integer (unix ms)         | Emit timestamp                                                                                   |
| `witnessed_at`        | integer (unix ms) \| null | Witness timestamp                                                                                |
| `orphan_after`        | integer (unix ms)         | When this prediction flips to `orphaned` if no witness arrives                                   |
| `cohort_key`          | text                      | Computed grouping key. Tuple of surface, model, model_version, confidence_bucket                 |

### `uncertainty_calibration_snapshot`

Materialized reliability per cohort. Recomputed on a cron, not on read.

| Column               | Type              | Purpose                                               |
| -------------------- | ----------------- | ----------------------------------------------------- |
| `id`                 | text (uuidv7)     | Primary key                                           |
| `cohort_key`         | text              | Joins to `uncertainty_prediction.cohort_key`          |
| `bucket_lower`       | real              | Confidence bucket lower bound (e.g. 0.7)              |
| `bucket_upper`       | real              | Confidence bucket upper bound (e.g. 0.8)              |
| `claimed_confidence` | real              | Mean claimed confidence in this bucket                |
| `actual_correctness` | real              | Mean witnessed correctness in this bucket             |
| `prediction_count`   | integer           | Witnessed predictions in this bucket                  |
| `orphan_count`       | integer           | Orphaned predictions in this cohort (separate metric) |
| `brier_score`        | real              | Mean squared error of the cohort                      |
| `computed_at`        | integer (unix ms) | When this snapshot ran                                |

Indexes: `cohort_key`, `surface`, `state`, `(state, orphan_after)` for the orphan sweep.

---

## API

Hono routes mounted at `/api/uncertainty`. Internal-only. ctrl is the only consumer surface.

### `POST /api/uncertainty/predictions`

Surface emits a prediction.

```ts
{
  surface: string,
  feature_key: string,
  input_fingerprint: string,
  model: string,
  model_version: string,
  claimed_confidence: number,
  prediction_payload: unknown,
  orphan_ttl_days?: number  // override per-surface default
}
```

Returns `{ id, orphan_after }`.

### `PUT /api/uncertainty/predictions/:id/witness`

Surface witnesses an outcome.

```ts
{
  outcome_label: string,
  outcome_correctness: number,  // 0.0 - 1.0
  outcome_payload?: unknown
}
```

Idempotent. If already witnessed, returns 409.

### `GET /api/uncertainty/calibration`

Reliability data for a cohort. Read from snapshot table.

Query params: `surface`, `model`, `model_version`. Returns array of bucket rows with claimed vs actual + counts.

### `GET /api/uncertainty/orphans`

Orphan metrics per surface. For dashboards.

---

## Algorithms

The engine ships with the boring math first. Conformal prediction, Bayesian feature priors, and disagreement detection wait for v2.

### v1: Brier + reliability diagrams

For each cohort, bucket predictions by claimed confidence (10 buckets of 0.1 width). Per bucket, compute mean claimed and mean correctness. The reliability diagram is the plot. Brier score is the headline number.

This is the math that makes the engine a credible audit tool. The output is publishable as-is.

### v2: Drift detection

Compare this week's calibration snapshot against the rolling 30-day baseline per cohort. If the per-bucket actual correctness drifts more than `K` standard deviations from baseline, flag the cohort. Cheap. Effective. Catches model regressions before users do.

### v3: Bayesian feature priors

Some `feature_key` values are systematically harder. Track per-feature posteriors over time. The engine learns _which inputs deserve less confidence regardless of what the model claims_ and exposes a `feature_difficulty` query for surfaces that want to attenuate their own confidence.

### v4: Disagreement detection

When two models run on the same `input_fingerprint`, log both predictions linked by fingerprint. Divergence between `claimed_confidence` values is itself a signal. Particularly useful for color naming where the model bake-off (Kimi vs Sonnet vs Qwen3) is already happening offline. Move it online.

### v5: Conformal prediction wrapper

Distribution-free confidence intervals. The proof is publishable; the math is clean. This is the version that lets the platform make a falsifiable claim like "if we say 80%, we are wrong less than 20% of the time, with no distributional assumptions." That claim is the public-facing payload.

---

## Cron jobs

Two scheduled tasks on the Worker.

| Job                | Cadence | Work                                                                             |
| ------------------ | ------- | -------------------------------------------------------------------------------- |
| `orphan-sweep`     | hourly  | Update `state = 'orphaned'` where `orphan_after < now()` and `state = 'emitted'` |
| `calibration-roll` | nightly | Recompute `uncertainty_calibration_snapshot` per active cohort                   |

Both jobs are bounded -- query, update, exit. No long-running work.

---

## Surface integration

Surfaces talk to the engine through a thin client (later extracted as `@rafters/uncertainty-client` if more than one surface adopts).

```ts
const prediction = await uncertainty.emit({
  surface: "rafters.color",
  feature_key: "oklch.lowChromaHighLightness",
  input_fingerprint: hashOklch(input),
  model: "claude-sonnet-4-7",
  model_version: response.model,
  claimed_confidence: 0.82,
  prediction_payload: { name: "parchment", character: "..." },
});

// later, when designer accepts/edits/rejects in ctrl
await uncertainty.witness(prediction.id, {
  outcome_label: "edited",
  outcome_correctness: 0.5,
  outcome_payload: { final_name: "bone" },
});
```

The client is non-blocking by design. Emit failures log and continue. The surface never blocks on the audit layer. Same posture as the original ezmode client; that part of the lineage was right.

---

## What this is not

- **Not a feature flag system.** The engine does not gate predictions. ctrl can route low-confidence predictions to human review, but that's ctrl's policy, not the engine's.
- **Not a metrics platform.** Brier score and reliability diagrams are the only metrics in scope. Latency, cost, throughput belong to observability tooling, not here.
- **Not a model registry.** Surfaces declare `model` and `model_version` per call. The engine doesn't manage model deployment.
- **Not a training signal pipeline.** The engine collects outcomes; it does not retrain models. If a future surface wants supervised fine-tuning data, it can query the engine, but that is downstream.

---

## Phasing

Phase 1 unblocks rafters. Everything else is incremental.

- **Phase 1 (spike):** D1 migration + Drizzle schema + zod companion. POST/PUT/GET routes. Orphan sweep. Brier + reliability diagrams via SQL. ctrl reads basic calibration into a debug page. Rafters wires `uncertainty.emit` into color naming. Wrangler binding flips from `ezmode-api` to `platform`.
- **Phase 2:** Drift detection + ctrl alarm surface. eavesdrop becomes a second surface.
- **Phase 3:** Bayesian feature priors. mail integration.
- **Phase 4:** Disagreement detection. Used to retire the color model bake-off scripts and bring it online.
- **Phase 5:** Conformal prediction wrapper. First public reliability diagram on rafters.studio.

---

## Open questions

- Outcome correctness mapping is per-surface. Is a surface-level config table needed, or is the convention "surface decides at witness time" enough? Spike with the latter; revisit if surfaces start disagreeing on what `edited` means.
- Public dashboard lives where? rafters.studio probably, but the data shape belongs to platform. Defer to phase 5.
- Should the engine emit its own predictions (about its own predictions)? Tempting. Out of scope for v1.
