import { z } from "zod";
import { jsonOk, jsonError } from "@/lib/api/response";
import { isImageMime, maxBytesForCustomerImageMime } from "@/lib/media-upload";
import { getS3Config } from "@/lib/s3-config";
import { createPresignedPut, extForContentType } from "@/lib/s3-server";

const bodySchema = z
  .object({
    contentType: z.string().min(1),
    contentLength: z.number().int().positive(),
  })
  .superRefine((data, ctx) => {
    if (!isImageMime(data.contentType) || !extForContentType(data.contentType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only JPEG, PNG, WebP, or GIF images are allowed",
        path: ["contentType"],
      });
      return;
    }
    const max = maxBytesForCustomerImageMime(data.contentType);
    if (!max || data.contentLength > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Image too large (max ${Math.round(max / (1024 * 1024))} MB)`,
        path: ["contentLength"],
      });
    }
  });

/** Anonymous presign for buyer reference images (product personalisation). */
export async function POST(req: Request) {
  const cfg = getS3Config();
  if (!cfg) {
    return jsonError("Image uploads are not configured", 503);
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    return jsonError("Invalid JSON", 400);
  }

  try {
    const out = await createPresignedPut(cfg, body.contentType, {
      keyPrefix: "customer-uploads",
    });
    return jsonOk(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Presign failed";
    return jsonError(msg, 400);
  }
}
