type GaTracePayload = Record<string, unknown>;

export function isGaTraceEnabled(): boolean {
  return process.env.GA_TRACE === 'true';
}

export function gaTrace(step: string, payload: GaTracePayload = {}): void {
  if (!isGaTraceEnabled()) {
    return;
  }

  console.log(
    JSON.stringify({
      tag: '[GA-TRACE]',
      step,
      ts: new Date().toISOString(),
      ...payload,
    }),
  );
}
