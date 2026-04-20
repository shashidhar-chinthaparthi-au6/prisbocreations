"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ShippingFormState = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

const emptyShip: ShippingFormState = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
};

type CheckoutState = {
  guestEmail: string;
  guestPhone: string;
  selectedAddressIdx: number | null;
  shippingForm: ShippingFormState;
  saveAddress: boolean;
  paymentMethod: "COD" | "RAZORPAY";
  couponCode: string;
  couponDiscountPaise: number;
  couponValid: boolean;
  currentStep: number;
  placing: boolean;
  idempotencyKey: string | null;
  setGuestContact: (email: string, phone: string) => void;
  setShippingForm: (p: Partial<ShippingFormState>) => void;
  setSelectedAddressIdx: (idx: number | null) => void;
  setSaveAddress: (v: boolean) => void;
  setPaymentMethod: (m: "COD" | "RAZORPAY") => void;
  applyCoupon: (code: string, discountPaise: number) => void;
  removeCoupon: () => void;
  setCurrentStep: (n: number) => void;
  goToStep: (n: number) => void;
  setPlacing: (v: boolean) => void;
  setIdempotencyKey: (k: string | null) => void;
  reset: () => void;
};

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set, get) => ({
      guestEmail: "",
      guestPhone: "",
      selectedAddressIdx: null,
      shippingForm: { ...emptyShip },
      saveAddress: true,
      paymentMethod: "COD",
      couponCode: "",
      couponDiscountPaise: 0,
      couponValid: false,
      currentStep: 0,
      placing: false,
      idempotencyKey: null,
      setGuestContact: (guestEmail, guestPhone) => set({ guestEmail, guestPhone }),
      setShippingForm: (p) =>
        set((s) => ({ shippingForm: { ...s.shippingForm, ...p } })),
      setSelectedAddressIdx: (selectedAddressIdx) => set({ selectedAddressIdx }),
      setSaveAddress: (saveAddress) => set({ saveAddress }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      applyCoupon: (couponCode, couponDiscountPaise) =>
        set({ couponCode, couponDiscountPaise, couponValid: true }),
      removeCoupon: () =>
        set({ couponCode: "", couponDiscountPaise: 0, couponValid: false }),
      setCurrentStep: (currentStep) => {
        const x = Number(currentStep);
        set({
          currentStep: Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0,
        });
      },
      goToStep: (n) => {
        const x = Number(n);
        set({
          currentStep: Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0,
        });
      },
      setPlacing: (placing) => set({ placing }),
      setIdempotencyKey: (idempotencyKey) => set({ idempotencyKey }),
      reset: () =>
        set({
          guestEmail: "",
          guestPhone: "",
          selectedAddressIdx: null,
          shippingForm: { ...emptyShip },
          saveAddress: true,
          paymentMethod: "COD",
          couponCode: "",
          couponDiscountPaise: 0,
          couponValid: false,
          currentStep: 0,
          placing: false,
          idempotencyKey: null,
        }),
    }),
    {
      name: "prisbo_checkout",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        guestEmail: s.guestEmail,
        guestPhone: s.guestPhone,
        selectedAddressIdx: s.selectedAddressIdx,
        shippingForm: s.shippingForm,
        saveAddress: s.saveAddress,
        paymentMethod: s.paymentMethod,
        couponCode: s.couponCode,
        couponDiscountPaise: s.couponDiscountPaise,
        couponValid: s.couponValid,
        currentStep: s.currentStep,
        idempotencyKey: s.idempotencyKey,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<CheckoutState> | undefined;
        const c = current as CheckoutState;
        if (!p || typeof p !== "object") return c;
        const raw = p.currentStep;
        const stepNum =
          typeof raw === "number" && Number.isFinite(raw)
            ? raw
            : parseInt(String(raw ?? ""), 10);
        return {
          ...c,
          ...p,
          currentStep: Number.isFinite(stepNum) && stepNum >= 0 ? Math.floor(stepNum) : 0,
        };
      },
    },
  ),
);

