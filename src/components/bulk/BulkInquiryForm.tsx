"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  company: z.string().trim().min(1, "Company name is required"),
  contactName: z.string().trim().min(1, "Your name is required"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(10, "Enter a valid 10-digit phone number").max(15),
  productInterest: z.string().trim().max(500).optional(),
  quantity: z.coerce.number().int().positive().optional().or(z.literal("")),
  deadlineDate: z.string().optional(),
  notes: z.string().trim().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

const inputCls =
  "w-full border border-sand-deep rounded-lg px-3 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors";
const labelCls = "block text-sm font-medium text-ink mb-1";
const errorCls = "text-xs text-red-600 mt-1";

export function BulkInquiryForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const res = await fetch("/api/v1/bulk-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }
      setSubmitted(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (submitted) {
    const wa = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_E164;
    return (
      <div className="bg-white rounded-2xl border border-sand-deep p-8 text-center">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="font-display text-xl text-ink mb-2">We've got your enquiry!</h2>
        <p className="text-ink-muted text-sm mb-6">
          We'll review your requirements and get back to you within 24 hours. For
          urgent requirements, reach us directly on WhatsApp.
        </p>
        {wa && (
          <a
            href={`https://wa.me/${wa}?text=Hi%2C+I+just+submitted+a+bulk+inquiry+on+your+website.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-full px-5 py-2.5 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Continue on WhatsApp
          </a>
        )}
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
          <label className={labelCls}>
            Company / Organisation <span className="text-red-500">*</span>
          </label>
          <input {...register("company")} className={inputCls} placeholder="Acme Corp" />
          {errors.company && <p className={errorCls}>{errors.company.message}</p>}
        </div>
        <div>
          <label className={labelCls}>
            Your name <span className="text-red-500">*</span>
          </label>
          <input {...register("contactName")} className={inputCls} placeholder="Priya Sharma" />
          {errors.contactName && <p className={errorCls}>{errors.contactName.message}</p>}
        </div>
        <div>
          <label className={labelCls}>
            Work email <span className="text-red-500">*</span>
          </label>
          <input
            {...register("email")}
            type="email"
            className={inputCls}
            placeholder="priya@acme.com"
          />
          {errors.email && <p className={errorCls}>{errors.email.message}</p>}
        </div>
        <div>
          <label className={labelCls}>
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            {...register("phone")}
            type="tel"
            className={inputCls}
            placeholder="+91 98765 43210"
          />
          {errors.phone && <p className={errorCls}>{errors.phone.message}</p>}
        </div>
      </div>

      <div>
        <label className={labelCls}>Product interest</label>
        <input
          {...register("productInterest")}
          className={inputCls}
          placeholder="e.g. Custom mugs, branded t-shirts, desk plaques"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelCls}>Approx. quantity</label>
          <input
            {...register("quantity")}
            type="number"
            min={25}
            className={inputCls}
            placeholder="e.g. 100"
          />
        </div>
        <div>
          <label className={labelCls}>Required by</label>
          <input {...register("deadlineDate")} type="date" className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Notes / requirements</label>
        <textarea
          {...register("notes")}
          rows={4}
          className={inputCls}
          placeholder="Any specific design requirements, budget, delivery location, etc."
        />
      </div>

      {serverError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{serverError}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-accent hover:bg-[#b06d26] disabled:opacity-60 text-white font-medium rounded-full py-3 transition-colors text-sm"
      >
        {isSubmitting ? "Sending…" : "Send inquiry"}
      </button>

      <p className="text-xs text-ink-muted text-center">
        We respond within 24 hours (Mon–Sat). Minimum order: 25 units.
      </p>
    </form>
  );
}
