"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
export type SchemaFieldType = "text" | "select" | "number" | "boolean";

export type SchemaFieldLite = {
  _id?: string;
  key: string;
  label: string;
  fieldType: SchemaFieldType;
  options: string[];
  isHighlight: boolean;
  isRequired: boolean;
};

export type WizardVariant = {
  tempId: string;
  displayName: string;
  hexCode: string;
  skuSuffix: string;
  basePrice: number;
  mrp: number;
  isActive: boolean;
};

export type WizardImage = {
  url: string;
  isPrimary: boolean;
  displayOrder: number;
  serverImageId?: string;
};

export interface ProductWizardState {
  currentStep: number;
  productId: string | null;
  categoryId: string;
  subcategoryId: string;
  schema: SchemaFieldLite[];
  name: string;
  brand: string;
  skuBase: string;
  packOf: number;
  hasColourVariants: boolean;
  hasSizePricing: boolean;
  sizesNotApplicable: boolean;
  variants: WizardVariant[];
  variantImages: Record<string, WizardImage[]>;
  selectedSizes: string[];
  stockMatrix: Record<string, Record<string, { stock: number; priceOverride: number | null }>>;
  descriptionTemplate: string;
  specValues: Record<string, string | number | boolean | null>;
  genericName: string;
  countryOfOrigin: string;
  manufacturerName: string;
  manufacturerAddress: string;
  packerSameAsMfr: boolean;
  packerAddress: string;
  publishNow: boolean;
  scheduledPublishAt: string;
  setStep: (n: number) => void;
  setField: <K extends keyof Omit<ProductWizardState, "setStep" | "setField" | "reset" | "hydrateFromProduct">>(
    key: K,
    value: ProductWizardState[K],
  ) => void;
  reset: () => void;
  hydrateFromProduct: (payload: {
    product: Record<string, unknown>;
    schemaFields: SchemaFieldLite[];
  }) => void;
}

const defaultState: Omit<
  ProductWizardState,
  "setStep" | "setField" | "reset" | "hydrateFromProduct"
> = {
  currentStep: 0,
  productId: null,
  categoryId: "",
  subcategoryId: "",
  schema: [],
  name: "",
  brand: "",
  skuBase: "",
  packOf: 1,
  hasColourVariants: true,
  hasSizePricing: false,
  sizesNotApplicable: false,
  variants: [],
  variantImages: {},
  selectedSizes: ["S", "M", "L"],
  stockMatrix: {},
  descriptionTemplate: "",
  specValues: {},
  genericName: "",
  countryOfOrigin: "India",
  manufacturerName: "",
  manufacturerAddress: "",
  packerSameAsMfr: true,
  packerAddress: "",
  publishNow: true,
  scheduledPublishAt: "",
};

export const useProductWizard = create<ProductWizardState>()(
  persist(
    (set) => ({
      ...defaultState,
      setStep: (n) => set({ currentStep: n }),
      setField: (key, value) => set({ [key]: value } as Partial<ProductWizardState>),
      reset: () => set({ ...defaultState }),
      hydrateFromProduct: ({ product, schemaFields }) => {
        const cvs = (product.colourVariants ?? []) as Record<string, unknown>[];
        const variants: WizardVariant[] = cvs.map((cv) => ({
          tempId: String(cv._id ?? crypto.randomUUID()),
          displayName: String(cv.displayName ?? ""),
          hexCode: String(cv.hexCode ?? "#000000"),
          skuSuffix: String(cv.skuSuffix ?? "").toUpperCase(),
          basePrice: Number(cv.basePrice ?? 0),
          mrp: Number(cv.mrp ?? 0),
          isActive: cv.isActive !== false,
        }));
        const variantImages: Record<string, WizardImage[]> = {};
        for (const cv of cvs) {
          const tid = String(cv._id ?? "");
          const imgs = (cv.images ?? []) as Record<string, unknown>[];
          variantImages[tid] = imgs.map((im, idx) => ({
            url: String(im.url ?? ""),
            isPrimary: Boolean(im.isPrimary),
            displayOrder: Number(im.displayOrder ?? idx),
            serverImageId: im._id ? String(im._id) : undefined,
          }));
        }
        const specValues =
          product.specValues && typeof product.specValues === "object" && !Array.isArray(product.specValues)
            ? (product.specValues as Record<string, string | number | boolean | null>)
            : {};
        set({
          productId: String(product._id ?? ""),
          categoryId: product.categoryId ? String(product.categoryId) : "",
          subcategoryId: product.subcategoryId ? String(product.subcategoryId) : "",
          schema: schemaFields,
          name: String(product.name ?? ""),
          brand: String(product.brand ?? ""),
          skuBase: String(product.skuBase ?? product.sku ?? ""),
          packOf: Number(product.packOf ?? 1),
          hasColourVariants: product.hasColourVariants !== false,
          hasSizePricing: Boolean(product.hasSizePricing),
          sizesNotApplicable: Boolean(product.sizesNotApplicable),
          variants,
          variantImages,
          descriptionTemplate: String(product.descriptionTemplate ?? ""),
          specValues,
          genericName: String(product.genericName ?? ""),
          countryOfOrigin: String(product.countryOfOrigin ?? "India"),
          manufacturerName: String(product.manufacturerName ?? ""),
          manufacturerAddress: String(product.manufacturerAddress ?? ""),
          packerSameAsMfr: product.packerSameAsMfr !== false,
          packerAddress: String(product.packerAddress ?? ""),
        });
      },
    }),
    {
      name: "product_wizard_draft",
      partialize: (s) => ({
        currentStep: s.currentStep,
        productId: s.productId,
        categoryId: s.categoryId,
        subcategoryId: s.subcategoryId,
        schema: s.schema,
        name: s.name,
        brand: s.brand,
        skuBase: s.skuBase,
        packOf: s.packOf,
        hasColourVariants: s.hasColourVariants,
        hasSizePricing: s.hasSizePricing,
        sizesNotApplicable: s.sizesNotApplicable,
        variants: s.variants,
        variantImages: s.variantImages,
        selectedSizes: s.selectedSizes,
        stockMatrix: s.stockMatrix,
        descriptionTemplate: s.descriptionTemplate,
        specValues: s.specValues,
        genericName: s.genericName,
        countryOfOrigin: s.countryOfOrigin,
        manufacturerName: s.manufacturerName,
        manufacturerAddress: s.manufacturerAddress,
        packerSameAsMfr: s.packerSameAsMfr,
        packerAddress: s.packerAddress,
        publishNow: s.publishNow,
        scheduledPublishAt: s.scheduledPublishAt,
      }),
      skipHydration: true,
    },
  ),
);
