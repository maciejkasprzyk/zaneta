/**
 * Only these people may sign in. The list comes from the `ALLOWED_EMAILS`
 * environment variable (comma separated), so no address lives in the repo.
 * An empty list lets nobody in.
 */
export function parseAllowedEmails(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isEmailAllowed(
  email: string | null | undefined,
  value: string | undefined = process.env.ALLOWED_EMAILS,
): boolean {
  if (!email) return false;
  return parseAllowedEmails(value).has(email.trim().toLowerCase());
}
