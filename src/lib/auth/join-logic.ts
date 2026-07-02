export type JoinResolution =
  | { ok: true; mode: "existing" | "new" }
  | { ok: false; status: 401 | 409; error: string };

const WRONG_PASSWORD_ERROR =
  "An account with this email already exists — enter that account's password to join.";
const OAUTH_ONLY_ERROR =
  "This email is already registered through Google sign-in. Sign in with Google, then use your invite link to join.";

export async function resolveJoinUser(
  existingUser: { password: string | null } | null,
  password: string,
  compare: (plain: string, hash: string) => Promise<boolean>,
): Promise<JoinResolution> {
  if (!existingUser) {
    return { ok: true, mode: "new" };
  }
  if (!existingUser.password) {
    return { ok: false, status: 409, error: OAUTH_ONLY_ERROR };
  }
  const valid = await compare(password, existingUser.password);
  if (!valid) {
    return { ok: false, status: 401, error: WRONG_PASSWORD_ERROR };
  }
  return { ok: true, mode: "existing" };
}
