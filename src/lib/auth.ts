const NKUST_EMAIL_DOMAIN = "nkust.edu.tw";

export type Viewer =
  | { kind: "anonymous" }
  | { kind: "user"; email: string; isNkust: boolean };

export function getViewerFromRequest(req: Request): Viewer {
  // Temporary auth stub until real email verification is implemented.
  // Provide a header like: X-User-Email: someone@nkust.edu.tw
  const email = req.headers.get("x-user-email")?.trim();
  if (!email) return { kind: "anonymous" };
  const lower = email.toLowerCase();
  const isNkust = lower.endsWith(`@${NKUST_EMAIL_DOMAIN}`);
  return { kind: "user", email, isNkust };
}


