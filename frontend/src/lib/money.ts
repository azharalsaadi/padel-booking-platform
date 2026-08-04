const BAISA_PER_OMR = 1000

/** Formats an integer baisa amount as an OMR display string, e.g. 16000 -> "OMR 16.000". */
export function formatBaisa(baisa: number, currency = 'OMR'): string {
  const omr = baisa / BAISA_PER_OMR
  return `${currency} ${omr.toFixed(3)}`
}

export function baisaToOmr(baisa: number): number {
  return baisa / BAISA_PER_OMR
}
