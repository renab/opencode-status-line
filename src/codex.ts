import { Rpc } from "@opencode/plugin"

/** The Codex usage plugin's RPC contract. Its quota service remains optional. */
export const CODEX_USAGE_RPC = Rpc.define({
  id: "opencode-codex-usage",
  methods: {
    usage: {
      input: { type: "object", additionalProperties: false },
      output: { type: "object" },
    },
  },
  events: {},
})

export interface CodexQuotaSnapshot {
  error?: string
  used?: { primary?: number | string | null; secondary?: number | string | null } | string
  windowMinutes?: { primary?: number | string | null; secondary?: number | string | null } | string
}

export interface CodexQuotaReading {
  used: number
  remaining: number
  windowMinutes: number
  label: string
}

function pair(value: CodexQuotaSnapshot["used"] | CodexQuotaSnapshot["windowMinutes"]): unknown[] {
  if (typeof value === "string") return value.split("/", 2)
  if (value && typeof value === "object") return [value.primary, value.secondary]
  return []
}

function percentage(value: unknown): number | undefined {
  if (typeof value !== "number" && typeof value !== "string") return undefined
  const text = typeof value === "string" ? value.trim().replace(/%$/, "") : value
  if (typeof text === "string" && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return undefined
  const parsed = Number(text)
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : undefined
}

function windowMinutes(value: unknown): number | undefined {
  if (typeof value !== "number" && typeof value !== "string") return undefined
  const parsed = typeof value === "number" ? value : Number(value.trim())
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function windowLabel(minutes: number): string {
  if (minutes === 7 * 24 * 60) return "1w"
  if (minutes % 60 === 0) return `${minutes / 60}h`
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h${minutes % 60}m`
}

/**
 * Keep only windows the service actually identifies. In particular, do not
 * invent a 5-hour primary window for accounts that report only a weekly limit.
 */
export function codexQuotaReadings(snapshot: CodexQuotaSnapshot): CodexQuotaReading[] {
  if (snapshot.error) return []
  const used = pair(snapshot.used)
  const minutes = pair(snapshot.windowMinutes)
  return [0, 1].flatMap((index) => {
    const usedPercent = percentage(used[index])
    const length = windowMinutes(minutes[index])
    if (usedPercent === undefined || length === undefined) return []
    return [{ used: usedPercent, remaining: 100 - usedPercent, windowMinutes: length, label: windowLabel(length) }]
  })
}
