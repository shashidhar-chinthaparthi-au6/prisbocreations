import { User } from "@/lib/models/User";

export async function listUsersAdmin() {
  return User.find()
    .select("-passwordHash")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
}
