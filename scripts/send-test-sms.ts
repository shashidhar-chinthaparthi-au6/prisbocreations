/**
 * Msg91 Flow test. Run: npx tsx scripts/send-test-sms.ts [mobile] [template_id]
 * Auth: MSG91_AUTHKEY. Template: 2nd arg or MSG91_TEMPLATE_TEST / MSG91_TEMPLATE_ORDER_* in .env.local.
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { isMsg91Configured } from "../src/lib/notify/config";
import { normalizeIndianMobile, sendMsg91Flow } from "../src/lib/notify/msg91";

function pickTemplateId(): string | undefined {
  const keys = [
    "MSG91_TEMPLATE_TEST",
    "MSG91_TEMPLATE_ORDER_PLACED",
    "MSG91_TEMPLATE_ORDER_PAID",
    "MSG91_TEMPLATE_ORDER_CANCELLED",
    "MSG91_TEMPLATE_ORDER_SHIPPED",
  ] as const;
  for (const k of keys) {
    const v = process.env[k]?.trim();
    if (v) return v;
  }
  return undefined;
}

async function main() {
  const rawMobile = process.argv[2] || "9963374057";
  const mobile = normalizeIndianMobile(rawMobile);
  if (!mobile) {
    console.error("Invalid mobile (need Indian 10-digit or 91XXXXXXXXXX):", rawMobile);
    process.exit(1);
  }
  if (!isMsg91Configured()) {
    console.error("MSG91_AUTHKEY missing in .env.local");
    process.exit(1);
  }
  const templateId = process.argv[3]?.trim() || pickTemplateId();
  if (!templateId) {
    console.error(
      "Pass template ID as 2nd arg, or set MSG91_TEMPLATE_TEST / MSG91_TEMPLATE_ORDER_PLACED in .env.local.",
    );
    console.error("Example: npx tsx scripts/send-test-sms.ts 9963374057 65xxxxxxxxx");
    process.exit(1);
  }

  const ok = await sendMsg91Flow({
    mobiles: mobile,
    templateId,
    variables: {
      VAR1: "TEST",
      VAR2: "₹1",
      VAR3: "http://localhost:3000",
      VAR4: "Prisbo test SMS",
    },
  });

  if (ok) {
    console.log("Msg91 Flow accepted. template_id:", templateId, "→", mobile);
  } else {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
