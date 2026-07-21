type GaTracePayload = Record<string, unknown>;

export function isGaTraceEnabled(): boolean {
  return process.env.NEXT_PUBLIC_GA_TRACE === "true";
}

export function gaTrace(step: string, payload: GaTracePayload = {}): void {
  if (!isGaTraceEnabled()) {
    return;
  }

  console.info("[GA-TRACE]", step, {
    ts: new Date().toISOString(),
    ...payload,
  });
}
