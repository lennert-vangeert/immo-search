import type { ListingData } from "../../src/data/listings";

/**
 * Portable listing fixtures.
 *
 * - `import type { ListingData }` shares the model's portable fields with no
 *   runtime dependency on the browser Firestore SDK (the type import is erased).
 * - `createdBy` is omitted: the seed assigns it round-robin across the seeded
 *   users. `createdAt`/`updatedAt` are stamped by the seed at write time.
 * - `thumbnailFileId` is null — real thumbnails come from in-app Drive uploads.
 */
export type ListingFixture = Omit<ListingData, "createdBy">;

export const LISTING_FIXTURES: ListingFixture[] = [
  {
    url: "https://www.immoweb.be/en/classified/house/for-sale/gent/9000/11111111",
    transactionType: "buy",
    price: 389000,
    title: "Bright townhouse near Portus Ganda",
    municipality: "Gent",
    bedrooms: 3,
    surfaceM2: 145,
    epc: "B",
    notes: "Great light, renovated kitchen. Street parking only.",
    thumbnailFileId: null,
    status: "visited",
    isFavorite: true,
  },
  {
    url: "https://www.immoweb.be/en/classified/apartment/for-rent/leuven/3000/22222222",
    transactionType: "rent",
    price: 1150,
    title: "2-bed apartment with terrace",
    municipality: "Leuven",
    bedrooms: 2,
    surfaceM2: 88,
    epc: "C",
    notes: "5 min walk to the station. Ask about the shared garden.",
    thumbnailFileId: null,
    status: "contacted",
    isFavorite: false,
  },
  {
    url: "https://www.zimmo.be/nl/antwerpen-2000/te-koop/appartement/33333333/",
    transactionType: "buy",
    price: 275000,
    title: "Loft-style flat, Het Eilandje",
    municipality: "Antwerpen",
    bedrooms: 1,
    surfaceM2: 72,
    epc: "A",
    notes: "",
    thumbnailFileId: null,
    status: "new",
    isFavorite: false,
  },
  {
    url: "https://www.immoweb.be/en/classified/house/for-sale/brugge/8000/44444444",
    transactionType: "buy",
    price: 465000,
    title: "Character home with garden",
    municipality: "Brugge",
    bedrooms: 4,
    surfaceM2: 210,
    epc: "D",
    notes: "Needs a new boiler. Big garden, south-facing.",
    thumbnailFileId: null,
    status: "new",
    isFavorite: true,
  },
  {
    url: "https://www.immovlan.be/en/detail/apartment/for-rent/2600/berchem/55555555",
    transactionType: "rent",
    price: 950,
    title: "Cozy studio, Berchem",
    municipality: "Berchem",
    bedrooms: null,
    surfaceM2: 45,
    epc: "E",
    notes: "Cheap but the EPC is rough — check heating costs.",
    thumbnailFileId: null,
    status: "rejected",
    isFavorite: false,
  },
];
