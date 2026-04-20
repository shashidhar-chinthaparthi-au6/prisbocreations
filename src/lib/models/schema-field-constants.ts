export const FIELD_TYPES = ["text", "select", "number", "boolean"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];
