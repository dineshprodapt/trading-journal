// Temporary restriction: keep this policy and firestore.rules in sync.
export const accessPolicy = {
  restricted: true,
  allowedEmails: ['dineshmick@gmail.com'] as readonly string[],
};

export const unauthorizedMessage =
  'Unauthorized access. This Google account does not have permission to access Trading Journal.';

export function isAllowedAccount(
  email: string | null,
  verified: boolean,
  provider: string | null,
): boolean {
  if (!accessPolicy.restricted) return true;
  return (
    verified &&
    provider === 'google.com' &&
    accessPolicy.allowedEmails.includes((email ?? '').trim().toLowerCase())
  );
}
