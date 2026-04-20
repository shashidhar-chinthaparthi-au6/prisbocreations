import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/models/User";
import { hashEmailChangeToken } from "@/lib/account/email-change-token";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return NextResponse.redirect(new URL("/account/profile?verify=invalid", req.url));
  }

  const hash = hashEmailChangeToken(token);
  await connectDb();

  const user = await User.findOne({
    emailChangeTokenHash: hash,
    emailChangeExpiry: { $gt: new Date() },
  })
    .select("+emailChangeTokenHash")
    .exec();

  if (!user?.emailChangeTo) {
    return NextResponse.redirect(new URL("/account/profile?verify=invalid", req.url));
  }

  const newEmail = user.emailChangeTo.toLowerCase();
  const clash = await User.exists({
    email: newEmail,
    _id: { $ne: user._id },
  });
  if (clash) {
    await User.collection.updateOne(
      { _id: user._id },
      { $unset: { emailChangeTokenHash: 1, emailChangeTo: 1, emailChangeExpiry: 1 } },
    );
    return NextResponse.redirect(new URL("/account/profile?verify=taken", req.url));
  }

  await User.collection.updateOne(
    { _id: user._id },
    {
      $set: { email: newEmail },
      $unset: { emailChangeTokenHash: 1, emailChangeTo: 1, emailChangeExpiry: 1 },
    },
  );

  return NextResponse.redirect(new URL("/account/profile?verified=true", req.url));
}
