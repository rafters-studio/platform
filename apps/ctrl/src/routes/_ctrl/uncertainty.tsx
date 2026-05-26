import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";

const calibrationRowSchema = z.object({
  id: z.string(),
  cohortKey: z.string(),
  bucketLower: z.number(),
  bucketUpper: z.number(),
  claimedConfidence: z.number(),
  actualCorrectness: z.number(),
  predictionCount: z.number(),
  orphanCount: z.number(),
  brierScore: z.number(),
  computedAt: z.number(),
});

type CalibrationRow = z.infer<typeof calibrationRowSchema>;

const surfaceOptions = [
  "rafters.color",
  "eavesdrop.classify",
  "mail.deliverability",
  "ctrl.decision",
] as const;

async function fetchCalibration(surface: string, model: string): Promise<CalibrationRow[]> {
  const params = new URLSearchParams({ surface, model });
  const res = await fetch(`/api/uncertainty/calibration?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}`);
  const raw = await res.json();
  return z.array(calibrationRowSchema).parse(raw);
}

const orphanRowSchema = z.object({
  surface: z.string(),
  orphan_count: z.number(),
});

type OrphanRow = z.infer<typeof orphanRowSchema>;

async function fetchOrphans(): Promise<OrphanRow[]> {
  const res = await fetch(`/api/uncertainty/orphans`, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}`);
  const raw = await res.json();
  return z.array(orphanRowSchema).parse(raw);
}

export const Route = createFileRoute("/_ctrl/uncertainty")({
  component: UncertaintyPage,
});

function UncertaintyPage() {
  const [surface, setSurface] = useState<string>(surfaceOptions[0]);
  const [model, setModel] = useState<string>("claude-sonnet-4-6");

  const { data, isPending, error } = useQuery({
    queryKey: ["uncertainty", "calibration", surface, model],
    queryFn: () => fetchCalibration(surface, model),
    enabled: !!surface && !!model,
  });

  const orphans = useQuery({
    queryKey: ["uncertainty", "orphans"],
    queryFn: fetchOrphans,
  });

  return (
    <main>
      <h1>Uncertainty calibration</h1>

      <div>
        <label htmlFor="surface-select">Surface</label>
        <select id="surface-select" value={surface} onChange={(e) => setSurface(e.target.value)}>
          {surfaceOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <label htmlFor="model-input">Model</label>
        <input
          id="model-input"
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="claude-sonnet-4-6"
        />
      </div>

      {isPending && <p aria-live="polite">Loading calibration data...</p>}
      {error && <p role="alert">Failed to load: {error.message}</p>}

      {data && data.length === 0 && (
        <p>No calibration data yet for this cohort. Predictions need to be witnessed first.</p>
      )}

      {data && data.length > 0 && (
        <>
          <section aria-label="Reliability diagram">
            <h2>Reliability diagram</h2>
            <p>
              Claimed confidence vs witnessed correctness per bucket. Perfect calibration: bars
              equal length. Overconfident: claimed taller than actual. Underconfident: actual taller
              than claimed.
            </p>
            <ul>
              {data.map((row) => (
                <li key={`bar-${row.id}`}>
                  <div>
                    <strong>
                      {row.bucketLower.toFixed(1)}&ndash;{row.bucketUpper.toFixed(1)}
                    </strong>{" "}
                    ({row.predictionCount} predictions)
                  </div>
                  <div aria-label={`Claimed ${row.claimedConfidence.toFixed(2)}`}>
                    Claimed:{" "}
                    <span
                      style={{
                        display: "inline-block",
                        height: "0.75rem",
                        width: `${row.claimedConfidence * 100}%`,
                        background: "currentColor",
                        opacity: 0.5,
                      }}
                    />{" "}
                    {row.claimedConfidence.toFixed(2)}
                  </div>
                  <div aria-label={`Actual ${row.actualCorrectness.toFixed(2)}`}>
                    Actual:{" "}
                    <span
                      style={{
                        display: "inline-block",
                        height: "0.75rem",
                        width: `${row.actualCorrectness * 100}%`,
                        background: "currentColor",
                      }}
                    />{" "}
                    {row.actualCorrectness.toFixed(2)}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <table>
            <caption>
              Per-bucket detail &mdash; {surface} / {model}
            </caption>
            <thead>
              <tr>
                <th scope="col">Bucket</th>
                <th scope="col">Claimed mean</th>
                <th scope="col">Actual mean</th>
                <th scope="col">Count</th>
                <th scope="col">Orphans (cohort)</th>
                <th scope="col">Brier</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.bucketLower.toFixed(1)}&ndash;{row.bucketUpper.toFixed(1)}
                  </td>
                  <td>{row.claimedConfidence.toFixed(2)}</td>
                  <td>{row.actualCorrectness.toFixed(2)}</td>
                  <td>{row.predictionCount}</td>
                  <td>{row.orphanCount}</td>
                  <td>{row.brierScore.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <section aria-label="Orphan summary">
        <h2>Orphan summary (all surfaces)</h2>
        <p>
          Predictions that were emitted but never witnessed within their TTL. Silence is its own
          state &mdash; not counted as wrong.
        </p>
        {orphans.isPending && <p aria-live="polite">Loading orphan counts...</p>}
        {orphans.error && <p role="alert">Failed to load orphans: {orphans.error.message}</p>}
        {orphans.data && orphans.data.length === 0 && <p>No orphans recorded yet.</p>}
        {orphans.data && orphans.data.length > 0 && (
          <table>
            <thead>
              <tr>
                <th scope="col">Surface</th>
                <th scope="col">Orphan count</th>
              </tr>
            </thead>
            <tbody>
              {orphans.data.map((row) => (
                <tr key={row.surface}>
                  <td>{row.surface}</td>
                  <td>{row.orphan_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
