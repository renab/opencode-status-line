import { describe, expect, test } from "bun:test"
import { codexQuotaReadings } from "../src/codex.ts"

describe("codexQuotaReadings", () => {
  test("formats identified primary and weekly windows", () => {
    expect(
      codexQuotaReadings({
        used: { primary: 22, secondary: 50 },
        windowMinutes: { primary: 300, secondary: 10_080 },
      }),
    ).toEqual([
      { used: 22, remaining: 78, windowMinutes: 300, label: "5h" },
      { used: 50, remaining: 50, windowMinutes: 10_080, label: "1w" },
    ])
  })

  test("shows only the weekly window when the account has no primary limit", () => {
    expect(
      codexQuotaReadings({
        used: { primary: null, secondary: 25 },
        windowMinutes: { primary: null, secondary: 10_080 },
      }),
    ).toEqual([{ used: 25, remaining: 75, windowMinutes: 10_080, label: "1w" }])
  })

  test("does not invent a default window when metadata is missing", () => {
    expect(codexQuotaReadings({ used: { primary: 25, secondary: 75 } })).toEqual([])
  })

  test("accepts legacy slash-delimited values", () => {
    expect(codexQuotaReadings({ used: "10/40", windowMinutes: "300/10080" }).map((item) => item.label)).toEqual([
      "5h",
      "1w",
    ])
  })

  test("ignores error snapshots and malformed values", () => {
    expect(codexQuotaReadings({ error: "unauthorized", used: { primary: 10 }, windowMinutes: { primary: 300 } })).toEqual(
      [],
    )
    expect(
      codexQuotaReadings({ used: { primary: "unknown", secondary: 40 }, windowMinutes: { primary: 300, secondary: 0 } }),
    ).toEqual([])
  })
})
