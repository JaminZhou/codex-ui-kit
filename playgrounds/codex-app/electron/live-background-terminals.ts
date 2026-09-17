export interface LiveBackgroundTerminal {
  command: string;
  cpuPercent: number | null;
  cwd: string;
  itemId: string;
  osPid: number | null;
  processId: string;
  rssKb: number | null;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

export function normalizeLiveBackgroundTerminal(
  value: unknown,
): LiveBackgroundTerminal | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.itemId !== "string" ||
    candidate.itemId.length === 0 ||
    typeof candidate.processId !== "string" ||
    candidate.processId.length === 0 ||
    typeof candidate.command !== "string" ||
    typeof candidate.cwd !== "string"
  ) {
    return null;
  }
  return {
    command: candidate.command,
    cpuPercent: finiteNumber(candidate.cpuPercent),
    cwd: candidate.cwd,
    itemId: candidate.itemId,
    osPid: finiteNumber(candidate.osPid),
    processId: candidate.processId,
    rssKb: finiteNumber(candidate.rssKb),
  };
}

export function normalizeLiveBackgroundTerminals(
  value: unknown,
): LiveBackgroundTerminal[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeLiveBackgroundTerminal)
    .filter((terminal): terminal is LiveBackgroundTerminal => terminal !== null);
}
