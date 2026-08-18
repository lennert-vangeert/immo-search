/** Metadata scraped from an immo listing page by the /api/preview function. */
export type ListingPreview = {
  title?: string;
  price?: number;
  description?: string;
};

/**
 * Fetch listing metadata via the serverless scraper. Only works where /api is
 * served (Vercel deploy or `vercel dev`) — under plain `npm run dev` it 404s and
 * this throws, which the caller surfaces as a friendly error.
 */
export const fetchListingPreview = async (
  url: string
): Promise<ListingPreview> => {
  const res = await fetch(`/api/preview?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`preview failed (${res.status})`);
  return (await res.json()) as ListingPreview;
};
