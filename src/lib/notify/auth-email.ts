import { notifyPasswordResetEmail } from "@/lib/notify/dispatch";

function emailEnabled(): boolean {
  return process.env.EMAIL_ENABLED === "true";
}

export async function sendPasswordResetLinkEmail(to: string, resetLink: string): Promise<void> {
  if (emailEnabled()) {
    await notifyPasswordResetEmail(to, resetLink);
    return;
  }
  console.info(
    "[auth-email] EMAIL_ENABLED!=true — password reset link (not sent via SES):\n",
    `To: ${to}\n`,
    resetLink,
  );
}
