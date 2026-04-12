/**
 * One-off SES test. Run: npx tsx scripts/send-test-email.ts [to@email]
 * Loads .env.local like other scripts.
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { isSesConfigured } from "../src/lib/notify/config";
import { sendSesEmail } from "../src/lib/notify/ses";

const to = (process.argv[2] || "shashi@enculture.ai").trim();

async function main() {
  if (!isSesConfigured()) {
    console.error("SES not configured: set AWS_REGION and SES_FROM_EMAIL (and AWS credentials).");
    process.exit(1);
  }
  console.log("Sending test email to", to, "from", process.env.SES_FROM_EMAIL, "region", process.env.AWS_REGION);
  await sendSesEmail({
    to,
    subject: "Prisbocreations — local SES test",
    textBody: `This is a test message sent at ${new Date().toISOString()} from scripts/send-test-email.ts.`,
    htmlBody: `<p>This is a <strong>test</strong> message sent at ${new Date().toISOString()} from <code>scripts/send-test-email.ts</code>.</p>`,
  });
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
