import { connectDb } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { jsonOk, jsonError } from "@/lib/api/response";
import { syncShiprocketForOrder } from "@/lib/services/shiprocketSync";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const { action, note } = body as { action?: string; note?: string };
  if (action !== "approve" && action !== "reject") {
    return jsonError("action must be 'approve' or 'reject'", 400);
  }

  await connectDb();

  const order = await Order.findOne({ "items.proofToken": token });
  if (!order) return jsonError("Proof link not found or expired", 404);

  const itemIndex = (order.items as Array<{ proofToken?: string }>).findIndex(
    (it) => it.proofToken === token,
  );
  if (itemIndex === -1) return jsonError("Proof item not found", 404);

  const item = order.items[itemIndex] as unknown as Record<string, unknown>;

  if (item.proofStatus === "approved") {
    return jsonOk({ message: "Already approved" });
  }

  if (action === "approve") {
    item.proofApproved = true;
    item.proofStatus = "approved";
    item.proofApprovedAt = new Date();

    const allApproved = (order.items as Array<{ proofApproved?: boolean; proofToken?: string }>)
      .filter((it) => it.proofToken)
      .every((it) => it.proofApproved === true || it.proofToken === token);

    if (allApproved) {
      order.status = "in_production" as typeof order.status;
      await order.save();
      syncShiprocketForOrder(order._id.toString()).catch(() => {});
    } else {
      await order.save();
    }
  } else {
    item.proofStatus = "rejected";
    item.proofRejectionNote = note ?? "";
    order.status = "awaiting_proof" as typeof order.status;
    await order.save();

    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      const { sendEmail } = await import("@/lib/notify/email/ses");
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      await sendEmail({
        to: adminEmail,
        subject: `[Proof Rejected] Order #${order.invoiceNumber ?? order._id}`,
        html: `<p>Customer requested changes on order <strong>${order.invoiceNumber ?? order._id}</strong>.</p><p><strong>Note:</strong> ${note ?? "(no note provided)"}</p><p><a href="${baseUrl}/admin/orders">View in admin</a></p>`,
        log: { event: "PROOF_REJECTED" },
      });
    }
  }

  return jsonOk({ success: true });
}
