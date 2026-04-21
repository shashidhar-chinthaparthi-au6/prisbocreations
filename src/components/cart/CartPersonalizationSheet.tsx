"use client";

import { useEffect, useState } from "react";
import { CustomizationForm } from "@/components/customization/CustomizationForm";
import { validateClientCustomization } from "@/lib/customization-client-validate";
import type { CartLine } from "@/components/cart/CartProvider";
import { useCartStore } from "@/lib/store/cart-store";
import type { CustomizationDataMap, CustomizationFilesMap } from "@/lib/customization-types";

type Props = {
  line: CartLine | null;
  open: boolean;
  onClose: () => void;
};

export function CartPersonalizationSheet({ line, open, onClose }: Props) {
  const updateLineCustomization = useCartStore((s) => s.updateLineCustomization);
  const [data, setData] = useState<CustomizationDataMap>({});
  const [files, setFiles] = useState<CustomizationFilesMap>({});
  const [fieldErr, setFieldErr] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  useEffect(() => {
    if (!open || !line) return;
    setData(line.customizationData ?? {});
    setFiles(line.customizationFiles ?? {});
    setFieldErr(null);
  }, [open, line]);

  if (!open || !line?.customizationSchema?.length) return null;

  const schema = line.customizationSchema;

  function save() {
    const row = line;
    if (!row) return;
    const v = validateClientCustomization(schema, data, files);
    if (!v.ok) {
      setFieldErr(v.firstInvalidKey ?? null);
      return;
    }
    setFieldErr(null);
    updateLineCustomization(row.id, { customizationData: data, customizationFiles: files });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[250] flex items-end justify-center bg-black/45 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Edit personalisation"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div className="relative z-[1] flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-[#E8E0D6] bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[#E8E0D6] px-4 py-3">
          <h2 className="text-base font-semibold text-[#3D3835]">Edit personalisation</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm text-[#6B6560] hover:bg-[#F5E6D0]"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <CustomizationForm
            fields={schema}
            data={data}
            files={files}
            onChange={({ data: d, files: f }) => {
              setData(d);
              setFiles(f);
            }}
            invalidFieldKey={fieldErr}
            disabled={uploadBusy}
            onUploadingChange={setUploadBusy}
          />
        </div>
        <div className="shrink-0 border-t border-[#E8E0D6] p-4">
          <button
            type="button"
            disabled={uploadBusy}
            onClick={save}
            className="w-full rounded-full bg-[#C47A2B] py-3 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
