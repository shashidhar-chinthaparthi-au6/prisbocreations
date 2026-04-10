import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var mongooseConn: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

const g = globalThis as typeof globalThis & {
  mongooseConn?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};

if (!g.mongooseConn) {
  g.mongooseConn = { conn: null, promise: null };
}

export async function connectDb(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  if (g.mongooseConn!.conn) return g.mongooseConn!.conn;
  if (!g.mongooseConn!.promise) {
    g.mongooseConn!.promise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }
  g.mongooseConn!.conn = await g.mongooseConn!.promise;
  return g.mongooseConn!.conn;
}
