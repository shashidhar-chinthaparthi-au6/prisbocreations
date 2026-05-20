import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) { console.error("MONGODB_URI missing"); process.exit(1); }

async function main() {
  await mongoose.connect(uri!);
  const db = mongoose.connection.db!;
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    await db.dropCollection(col.name);
    console.log("dropped:", col.name);
  }
  console.log("DB cleared.");
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
