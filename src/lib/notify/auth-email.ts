import { notify, notifyPasswordResetEmail } from "@/lib/notify/dispatch";

function emailEnabled(): boolean {
  return process.env.EMAIL_ENABLED === "true";
}

export async function sendPasswordResetLinkEmail(
  to: string,
  resetLink: string,
  firstName?: string,
): Promise<void> {
  if (emailEnabled()) {
    await notifyPasswordResetEmail(to, resetLink, firstName);
    return;
  }
  console.info(
    "[auth-email] EMAIL_ENABLED!=true — password reset link (not sent via SES):\n",
    `To: ${to}\n`,
    resetLink,
  );
}

export async function sendEmailChangeVerificationEmail(
  to: string,
  verifyLink: string,
  firstName: string,
  userId: string,
): Promise<void> {
  if (emailEnabled()) {
    await notify("EMAIL_CHANGE", {
      email: to,
      firstName,
      verifyUrl: verifyLink,
      userId,
    });
    return;
  }
  console.info("[auth-email] EMAIL_ENABLED!=true — email change link (not sent):\n", `To: ${to}\n`, verifyLink);
}
