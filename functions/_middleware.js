// Password-protects the whole site while it's a draft.
// The password lives in Cloudflare (Pages project -> Settings -> Variables and Secrets -> SITE_PASSWORD),
// never in this repo. Any username works; only the password is checked.
// To open the site to the public later, delete this file (or the whole functions/ folder).

export async function onRequest({ request, env, next }) {
  const password = env.SITE_PASSWORD;
  const noindex = { "X-Robots-Tag": "noindex, nofollow" };

  // Fail closed: if the password hasn't been set, show nothing.
  if (!password) {
    return new Response("This site isn't open yet.", { status: 503, headers: { ...noindex, "Content-Type": "text/plain" } });
  }

  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Basic ")) {
    let decoded = "";
    try { decoded = atob(auth.slice(6)); } catch {}
    const given = decoded.slice(decoded.indexOf(":") + 1);
    if (await matches(given, password)) {
      const res = await next();
      const out = new Response(res.body, res);
      out.headers.set("X-Robots-Tag", "noindex, nofollow");
      return out;
    }
  }

  return new Response("Password required.", {
    status: 401,
    headers: {
      ...noindex,
      "Content-Type": "text/plain",
      "WWW-Authenticate": 'Basic realm="RootEd Foundation preview", charset="UTF-8"',
    },
  });
}

// Compare hashes so the check takes the same time whether the guess is close or not.
async function matches(given, expected) {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
}
