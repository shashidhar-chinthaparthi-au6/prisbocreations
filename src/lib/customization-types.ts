export type CustomizationFieldType = "image" | "text" | "textarea" | "url" | "select" | "boolean";

export type CustomizationFieldDef = {
  key: string;
  type: CustomizationFieldType;
  label: string;
  required: boolean;
  hint?: string;
  maxChars?: number;
  options?: string[];
  multiple?: boolean;
  maxFiles?: number;
};

export type CustomizationFileMeta = {
  url: string;
  fileId: string;
  filename: string;
};

export type CustomizationDataMap = Record<string, string | string[] | boolean>;
export type CustomizationFilesMap = Record<
  string,
  CustomizationFileMeta | CustomizationFileMeta[]
>;
