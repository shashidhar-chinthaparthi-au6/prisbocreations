import { z } from "zod";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { getS3Config } from "@/lib/s3-config";
import { createPresignedPut, extForContentType } from "@/lib/s3-server";
import { maxBytesForAdminMime } from "@/lib/media-upload";

const bodySchema = z
  .object({
    contentType: z.string().min(1),
    contentLength: z.number().int().positive(),
  })
  .superRefine((data, ctx) => {
    if (!extForContentType(data.contentType)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Unsupported content type", path: ["contentType"] });
      return;
    }
    const max = maxBytesForAdminMime(data.contentType);
    if (data.contentLength > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `File too large for this type (max ${Math.round(max / (1024 * 1024))} MB)`,
        path: ["contentLength"],
      });
    }
  });

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const cfg = getS3Config();
  if (!cfg) {
    return jsonError("S3 uploads are not configured on the server", 503);
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const json = await req.json();
    body = bodySchema.parse(json);
  } catch {
    return jsonError("Invalid body (contentType, contentLength required)", 400);
  }

  try {
    const { uploadUrl, publicUrl, key } = await createPresignedPut(cfg, body.contentType);
    return jsonOk({
      uploadUrl,
      publicUrl,
      key,
      contentType: body.contentType,
    });
  } catch (e) {
    console.error(e);
    return jsonError("Could not create upload URL", 500);
  }
}
