export type FlashState = { flash: string };

export function readFlash(state: unknown): string | null {
  if (typeof state !== "object" || state === null) return null;
  const { flash } = state as Record<string, unknown>;
  return typeof flash === "string" ? flash : null;
}
