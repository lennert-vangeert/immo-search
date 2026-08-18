// Vercel serverless function: fetch an immo listing page and extract basic
// metadata (title / price / description) from its Open Graph tags.
//
// Security: this is a public endpoint, so it ONLY fetches a fixed allow-list of
// real-estate domains. That inherently blocks SSRF to private/loopback hosts —
// there is no way to make it fetch an arbitrary URL. It reads public pages only.

type Req = { query: Record<string, string | string[] | undefined> };
type Res = {
  status: (code: number) => Res;
  json: (body: unknown) => void;
  setHeader: (k: string, v: string) => void;
};

const ALLOWED_DOMAINS = [
  "immoweb.be",
  "zimmo.be",
  "immovlan.be",
  "realo.be",
  "immoscoop.be",
  "logic-immo.be",
  "hebbes.be",
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";

const decode = (s: string): string =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();

/** Read a <meta property|name="key" content="…"> value (either attribute order). */
const meta = (html: string, key: string): string | undefined => {
  const a = html.match(
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`,
      "i"
    )
  );
  if (a?.[1]) return decode(a[1]);
  const b = html.match(
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`,
      "i"
    )
  );
  return b?.[1] ? decode(b[1]) : undefined;
};

const parsePrice = (...texts: (string | undefined)[]): number | undefined => {
  for (const text of texts) {
    if (!text) continue;
    // Only digits (no €): a clean price meta like "389000".
    if (/^\d{3,}$/.test(text.trim())) return Number(text.trim());
    // eslint-disable-next-line no-irregular-whitespace
    const m = text.match(/(\d[\d.\s ]{2,}\d)\s*€|€\s*(\d[\d.\s ]{2,}\d)/);
    const raw = m?.[1] ?? m?.[2];
    if (raw) {
      const n = Number(raw.replace(/[^\d]/g, ""));
      if (n > 0) return n;
    }
  }
  return undefined;
};

const hostAllowed = (host: string): boolean => {
  const h = host.replace(/^www\./, "").toLowerCase();
  return ALLOWED_DOMAINS.some((d) => h === d || h.endsWith(`.${d}`));
};

export default async function handler(req: Req, res: Res): Promise<void> {
  const raw = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  if (!raw) {
    res.status(400).json({ error: "missing_url" });
    return;
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    res.status(400).json({ error: "invalid_url" });
    return;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    res.status(400).json({ error: "invalid_url" });
    return;
  }
  if (!hostAllowed(url.hostname)) {
    res.status(400).json({ error: "domain_not_allowed" });
    return;
  }

  try {
    const resp = await fetch(url.toString(), {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) {
      res.status(502).json({ error: "fetch_failed", status: resp.status });
      return;
    }
    const html = (await resp.text()).slice(0, 500_000); // cap parse size

    const ogTitle = meta(html, "og:title");
    const htmlTitle = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
    const title = ogTitle || (htmlTitle ? decode(htmlTitle) : undefined);
    const description = meta(html, "og:description");
    const price = parsePrice(
      meta(html, "product:price:amount"),
      ogTitle,
      description
    );

    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600");
    res.status(200).json({ title, price, description });
  } catch {
    res.status(502).json({ error: "fetch_failed" });
  }
}
