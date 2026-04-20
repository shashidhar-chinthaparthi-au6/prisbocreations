import mongoose from "mongoose";
import { z } from "zod";

export const zObjectId = z.string().refine((s) => mongoose.isValidObjectId(s), "Invalid id");
