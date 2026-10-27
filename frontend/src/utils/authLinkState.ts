export type AuthLinkState = { from?: string; email?: string };

export function readAuthLinkState(state: unknown): AuthLinkState {
  if (typeof state !== "object" || state === null) return {};
  const { from, email } = state as Record<string, unknown>;
  return {
    from: typeof from === "string" ? from : undefined,
    email: typeof email === "string" ? email : undefined,
  };
}
