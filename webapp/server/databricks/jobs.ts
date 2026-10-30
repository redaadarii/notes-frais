import "server-only";
import { databricksJson } from "./client";

/** Jobs API : déclencher un job et suivre ses exécutions. */

export type RunStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED";

export interface JobRun {
  runId: number;
  jobId: number;
  status: RunStatus;
  parameters: Record<string, string>;
  startedAt: string | null;
  endedAt: string | null;
  message: string | null;
}

interface ApiState {
  life_cycle_state?: string;
  result_state?: string;
  state_message?: string;
}

interface ApiRun {
  run_id: number;
  job_id: number;
  state?: ApiState;
  status?: { state?: string; termination_details?: { code?: string; message?: string } };
  start_time?: number;
  end_time?: number;
  job_parameters?: { name: string; value?: string; default?: string }[];
}

/** Les cycles de vie Databricks, ramenés à cinq statuts compréhensibles. */
export function toRunStatus(state?: ApiState): RunStatus {
  switch (state?.life_cycle_state) {
    case "RUNNING":
    case "TERMINATING":
      return "RUNNING";
    case "TERMINATED":
      if (state.result_state === "SUCCESS") return "SUCCEEDED";
      return state.result_state === "CANCELED" ? "CANCELED" : "FAILED";
    case "SKIPPED":
      return "CANCELED";
    case "INTERNAL_ERROR":
      return "FAILED";
    default:
      return "PENDING"; // PENDING, QUEUED, BLOCKED, WAITING_FOR_RETRY
  }
}

function toJobRun(run: ApiRun): JobRun {
  const status = toRunStatus(run.state);
  return {
    runId: run.run_id,
    jobId: run.job_id,
    status,
    parameters: Object.fromEntries(
      (run.job_parameters ?? []).map((p) => [p.name, p.value ?? p.default ?? ""]),
    ),
    startedAt: run.start_time ? new Date(run.start_time).toISOString() : null,
    endedAt: run.end_time ? new Date(run.end_time).toISOString() : null,
    message: status === "FAILED" ? (run.state?.state_message ?? "Le traitement a échoué") : null,
  };
}

export async function runJob(jobId: number, parameters: Record<string, string>): Promise<number> {
  const { run_id } = await databricksJson<{ run_id: number }>("/api/2.2/jobs/run-now", {
    method: "POST",
    json: { job_id: jobId, job_parameters: parameters },
  });
  return run_id;
}

export async function getRun(runId: number): Promise<JobRun> {
  return toJobRun(await databricksJson<ApiRun>(`/api/2.2/jobs/runs/get?run_id=${runId}`));
}

export async function listRuns(jobId: number, limit = 20): Promise<JobRun[]> {
  const { runs = [] } = await databricksJson<{ runs?: ApiRun[] }>(
    `/api/2.2/jobs/runs/list?job_id=${jobId}&limit=${limit}`,
  );
  return runs.map(toJobRun);
}
