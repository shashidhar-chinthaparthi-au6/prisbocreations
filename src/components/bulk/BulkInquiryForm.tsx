"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BUDGET_RANGES, CUSTOMISATION_CHOICES, PACKAGING_CHOICES } from "@/lib/bulk/offer";
import { BULK_ENQUIRY_MIN, BULK_PRICE_MOQ } from "@/lib/bulk/pricing";
import { bulkWhatsAppHref } from "@/lib/bulk/whatsapp";
import { WhatsAppMark } from "@/components/bulk/WhatsAppMark";

const schema = z.object({
  company: z.string().trim().min(1, "Company name is required"),
  contactName: z.string().trim().min(1, "Your name is required"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(10, "Enter a valid 10-digit phone number").max(15),
  productInterest: z.string().trim().max(500).optional(),
  quantity: z.coerce
    .number({ invalid_type_error: "Enter a quantity" })
    .int()
    .min(BULK_ENQUIRY_MIN, `Enter at least ${BULK_ENQUIRY_MIN} pieces`),
  budget: z.string().trim().min(1, "Choose a budget range"),
  customisation: z.array(z.string()).min(1, "Choose at least one customisation"),
  packaging: z.array(z.string()).optional(),
  deadlineDate: z
    .string()
    .min(1, "Choose a delivery date")
    .refine((value) => {
      const day = new Date(`${value}T00:00:00`);
      if (Number.isNaN(day.getTime())) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return day >= today;
    }, "Choose today or a later date"),
  notes: z.string().trim().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

const inputCls =
  "w-full border border-sand-deep rounded-lg px-3 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors";
const labelCls = "block text-sm font-medium text-ink mb-1";
const errorCls = "text-xs text-red-600 mt-1";

function friendlyError(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as Record<string, string[] | undefined>;
    const first = Object.values(parsed).flat().find((msg) => typeof msg === "string" && msg.trim());
    if (first) return first;
  } catch {
    /* The API already sent a sentence. */
  }
  return raw;
}

function daysUntil(value: string): number | null {
  const day = new Date(`${value}T00:00:00`);
  if (Number.isNaN(day.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((day.getTime() - today.getTime()) / 86_400_000);
}

export function BulkInquiryForm({ whatsappPhone = "" }: { whatsappPhone?: string }) {
  const [submitted, setSubmitted] = useState<FormValues | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [today, setToday] = useState("");
  const wa = whatsappPhone || process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_E164 || "";

  const {
    register,
    handleSubmit,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company: "",
      contactName: "",
      email: "",
      phone: "",
      productInterest: "",
      budget: "",
      customisation: [],
      packaging: ["Bulk carton"],
      deadlineDate: "",
      notes: "",
    },
  });

  useEffect(() => {
    const day = new Date();
    const month = String(day.getMonth() + 1).padStart(2, "0");
    const date = String(day.getDate()).padStart(2, "0");
    setToday(`${day.getFullYear()}-${month}-${date}`);
  }, []);

  const deadline = watch("deadlineDate");
  const soon = deadline ? daysUntil(deadline) : null;

  function openWhatsApp() {
    const href = bulkWhatsAppHref(wa, getValues());
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const packaging = values.packaging?.length ? values.packaging : ["Bulk carton"];
    const customisation = `${values.customisation.join(", ")}. Packaging: ${packaging.join(", ")}`;
    try {
      const res = await fetch("/api/v1/bulk-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: values.company,
          contactName: values.contactName,
          email: values.email,
          phone: values.phone,
          productInterest: values.productInterest,
          quantity: values.quantity,
          budget: values.budget,
          customisation,
          deadlineDate: values.deadlineDate,
          notes: values.notes,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(friendlyError(data.error ?? "Something went wrong. Please try again."));
      }
      setSubmitted(values);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (submitted) {
    const href = bulkWhatsAppHref(wa, {
      ...submitted,
      customisation: submitted.customisation,
      packaging: submitted.packaging,
    });
    return (
      <div className="bg-white rounded-2xl border border-sand-deep p-8 text-center">
        <h2 className="font-display text-xl text-ink mb-2">We&apos;ve got your enquiry</h2>
        <p className="text-ink-muted text-sm mb-6">
          We&apos;ll review the quantity, budget, customisation, and delivery date, and reply within 24
          hours. For a faster conversation, continue on WhatsApp.
        </p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#128C7E] hover:bg-[#0d7368] text-white text-sm font-medium rounded-full px-5 py-2.5 transition-colors"
          >
            <WhatsAppMark />
            Continue on WhatsApp
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white rounded-2xl border border-sand-deep p-6 md:p-8 space-y-5"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelCls} htmlFor="bulk-company">
            Company / organisation <span className="text-red-500">*</span>
          </label>
          <input id="bulk-company" {...register("company")} className={inputCls} placeholder="Acme Corp" />
          {errors.company && <p className={errorCls}>{errors.company.message}</p>}
        </div>
        <div>
          <label className={labelCls} htmlFor="bulk-name">
            Your name <span className="text-red-500">*</span>
          </label>
          <input id="bulk-name" {...register("contactName")} className={inputCls} placeholder="Priya Sharma" />
          {errors.contactName && <p className={errorCls}>{errors.contactName.message}</p>}
        </div>
        <div>
          <label className={labelCls} htmlFor="bulk-email">
            Work email <span className="text-red-500">*</span>
          </label>
          <input
            id="bulk-email"
            {...register("email")}
            type="email"
            className={inputCls}
            placeholder="priya@acme.com"
          />
          {errors.email && <p className={errorCls}>{errors.email.message}</p>}
        </div>
        <div>
          <label className={labelCls} htmlFor="bulk-phone">
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            id="bulk-phone"
            {...register("phone")}
            type="tel"
            className={inputCls}
            placeholder="+91 98765 43210"
          />
          {errors.phone && <p className={errorCls}>{errors.phone.message}</p>}
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="bulk-pieces">
          Pieces you have in mind
        </label>
        <input
          id="bulk-pieces"
          {...register("productInterest")}
          className={inputCls}
          placeholder="e.g. Logo pens, photo mugs, tote bags"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelCls} htmlFor="bulk-quantity">
            Quantity <span className="text-red-500">*</span>
          </label>
          <input
            id="bulk-quantity"
            {...register("quantity")}
            type="number"
            min={BULK_ENQUIRY_MIN}
            className={inputCls}
            placeholder="e.g. 100"
          />
          {errors.quantity && <p className={errorCls}>{errors.quantity.message}</p>}
          <p className="mt-1 text-xs text-ink-muted">
            Listed prices start at {BULK_PRICE_MOQ}. From {BULK_ENQUIRY_MIN} we can still quote.
          </p>
        </div>
        <div>
          <label className={labelCls} htmlFor="bulk-budget">
            Budget <span className="text-red-500">*</span>
          </label>
          <select id="bulk-budget" {...register("budget")} className={inputCls} defaultValue="">
            <option value="" disabled>
              Choose a range
            </option>
            {BUDGET_RANGES.map((range) => (
              <option key={range} value={range}>
                {range}
              </option>
            ))}
          </select>
          {errors.budget && <p className={errorCls}>{errors.budget.message}</p>}
        </div>
      </div>

      <fieldset>
        <legend className={labelCls}>
          Customisation <span className="text-red-500">*</span>
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CUSTOMISATION_CHOICES.map((choice) => (
            <label
              key={choice}
              className="flex items-start gap-2 rounded-xl border border-sand-deep px-3 py-2.5 text-sm text-ink"
            >
              <input
                type="checkbox"
                value={choice}
                {...register("customisation")}
                className="mt-0.5"
              />
              <span>{choice}</span>
            </label>
          ))}
        </div>
        {errors.customisation && <p className={errorCls}>{errors.customisation.message}</p>}
      </fieldset>

      <fieldset>
        <legend className={labelCls}>Packaging</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PACKAGING_CHOICES.map((choice) => (
            <label
              key={choice}
              className="flex items-start gap-2 rounded-xl border border-sand-deep px-3 py-2.5 text-sm text-ink"
            >
              <input type="checkbox" value={choice} {...register("packaging")} className="mt-0.5" />
              <span>{choice}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className={labelCls} htmlFor="bulk-date">
          Delivery date <span className="text-red-500">*</span>
        </label>
        <input
          id="bulk-date"
          {...register("deadlineDate")}
          type="date"
          min={today || undefined}
          className={inputCls}
        />
        {errors.deadlineDate && <p className={errorCls}>{errors.deadlineDate.message}</p>}
        {soon != null && soon < 14 ? (
          <p className="mt-1 text-xs text-ink-muted">
            That date is soon for a bulk run. We will tell you if the studio can meet it.
          </p>
        ) : (
          <p className="mt-1 text-xs text-ink-muted">The date you need the order in hand.</p>
        )}
      </div>

      <div>
        <label className={labelCls} htmlFor="bulk-notes">
          Anything else
        </label>
        <textarea
          id="bulk-notes"
          {...register("notes")}
          rows={4}
          className={inputCls}
          placeholder="Colours, artwork notes, delivery city, or how the pieces will be handed out."
        />
      </div>

      {serverError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{serverError}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-accent hover:bg-[#b06d26] disabled:opacity-60 text-white font-medium rounded-full py-3 transition-colors text-sm"
        >
          {isSubmitting ? "Sending…" : "Send enquiry"}
        </button>
        {wa ? (
          <button
            type="button"
            onClick={openWhatsApp}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#128C7E] py-3 text-sm font-medium text-[#0d7368] transition-colors hover:bg-[#128C7E]/10"
          >
            <WhatsAppMark />
            WhatsApp this enquiry
          </button>
        ) : null}
      </div>

      <p className="text-xs text-ink-muted text-center">
        We respond within 24 hours, Monday to Saturday. Listed prices start at {BULK_PRICE_MOQ} pieces.
      </p>
    </form>
  );
}
