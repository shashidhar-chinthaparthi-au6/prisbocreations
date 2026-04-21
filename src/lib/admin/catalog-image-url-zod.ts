import { z } from "zod";

/** Absolute http(s) URLs or root-relative paths (e.g. /uploads/...). */
export const catalogImageUrlZ = z
  .union([z.string().url(), z.string().regex(/^\//)])
  .nullable()
  .optional();
