import { Timestamp } from "firebase-admin/firestore";
import { db } from "./firestore";
import { seedAdmin, seedUsers, SEED_PASSWORD, type SeedUser } from "./auth";
import { LISTING_FIXTURES } from "./fixtures/listings";

const DAY_MS = 24 * 60 * 60 * 1000;

const clearCollection = async (name: string): Promise<void> => {
  const snap = await db.collection(name).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
};

const seedListings = async (owners: SeedUser[]): Promise<number> => {
  await clearCollection("listings");
  const now = Date.now();

  for (let i = 0; i < LISTING_FIXTURES.length; i++) {
    const data = LISTING_FIXTURES[i];
    const owner = owners[i % owners.length];

    await db.collection("listings").add({
      ...data,
      reactions: {},
      createdBy: owner.uid,
      // Stagger createdAt so the "newest first" ordering is visible.
      createdAt: Timestamp.fromMillis(now - i * DAY_MS),
      updatedAt: Timestamp.fromMillis(now - i * DAY_MS),
    });
  }

  return LISTING_FIXTURES.length;
};

const main = async (): Promise<void> => {
  const bootstrapOnly = process.argv.includes("--bootstrap");

  if (bootstrapOnly) {
    const admin = await seedAdmin();
    console.log(`✓ Bootstrapped admin user: ${admin.email}`);
    return;
  }

  const users = await seedUsers();
  const listingCount = await seedListings(users);

  console.log(`✓ Seeded ${users.length} users and ${listingCount} listings.`);
  console.log(`  Note: login is Google-only. Against the emulator, use the`);
  console.log(`  mock Google picker and enter one of your ALLOWED_USER_EMAILS.`);
  console.log(`  Seeded email/password users exist only for attribution.`);
  console.log(`  (Seed password, if ever needed: ${SEED_PASSWORD})`);
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
