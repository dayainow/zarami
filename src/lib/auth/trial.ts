/** Shared trial credentials for the "체험해보기" path. */
export const TRIAL_EMAIL =
  process.env.NEXT_PUBLIC_TRIAL_EMAIL ?? "test@example.com";
export const TRIAL_PASSWORD =
  process.env.NEXT_PUBLIC_TRIAL_PASSWORD ?? "testpassword123";

/** Build the PKCE magic-link redirect target (server exchanges code here). */
export function buildMagicLinkRedirectTo(
  origin: string,
  nextPath: string = "/dashboard",
): string {
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", next);
  return url.href;
}
