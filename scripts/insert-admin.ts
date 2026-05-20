import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "@/lib/models/User";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const hash = await bcrypt.hash("Test@1234", 12);
  await User.findOneAndUpdate(
    { email: "shashi@prisbocreations.com" },
    { $set: { email: "shashi@prisbocreations.com", passwordHash: hash, name: "Shashi", avatarInitials: "S", role: "admin" } },
    { upsert: true }
  );
  console.log("✓ Admin created: shashi@prisbocreations.com");
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
