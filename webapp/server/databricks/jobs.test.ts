import { describe, expect, it } from "vitest";
import { toRunStatus } from "./jobs";

describe("toRunStatus", () => {
  it.each([
    [{ life_cycle_state: "QUEUED" }, "PENDING"],
    [{ life_cycle_state: "RUNNING" }, "RUNNING"],
    [{ life_cycle_state: "TERMINATED", result_state: "SUCCESS" }, "SUCCEEDED"],
    [{ life_cycle_state: "TERMINATED", result_state: "FAILED" }, "FAILED"],
    [{ life_cycle_state: "TERMINATED", result_state: "CANCELED" }, "CANCELED"],
    [{ life_cycle_state: "INTERNAL_ERROR" }, "FAILED"],
    [undefined, "PENDING"],
  ])("%j → %s", (state, expected) => {
    expect(toRunStatus(state)).toBe(expected);
  });
});
