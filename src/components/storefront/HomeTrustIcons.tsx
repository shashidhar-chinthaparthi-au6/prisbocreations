/** Trust strip icons: 28×28, stroke brand amber. */
export function TrustIconTruck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={28}
      height={28}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2m10 0h2a1 1 0 0 0 1-1v-3.35a1 1 0 0 0-.22-.624l-1.28-2.55a1 1 0 0 0-.9-.556H14M2 9h3m0 0h7"
        stroke="#C47A2B"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="18" r="2" stroke="#C47A2B" strokeWidth="1.75" />
      <circle cx="17" cy="18" r="2" stroke="#C47A2B" strokeWidth="1.75" />
    </svg>
  );
}

export function TrustIconShieldCheck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={28}
      height={28}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke="#C47A2B"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="#C47A2B"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrustIconHeart({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={28}
      height={28}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        stroke="#C47A2B"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Gift-ready / packaging */
export function TrustIconGift({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={28}
      height={28}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M20 12v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V12"
        stroke="#C47A2B"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 12V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5"
        stroke="#C47A2B"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 22V7" stroke="#C47A2B" strokeWidth="1.75" strokeLinecap="round" />
      <path
        d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7s1-5 4.5-5a2.5 2.5 0 0 1 0 5H12"
        stroke="#C47A2B"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7s-1-5-4.5-5a2.5 2.5 0 0 0 0 5H12"
        stroke="#C47A2B"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Shipping / tracking parcel */
export function TrustIconPackage({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={28}
      height={28}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"
        stroke="#C47A2B"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 22V12" stroke="#C47A2B" strokeWidth="1.75" strokeLinecap="round" />
      <path d="m3.29 7 8.71 5 8.71-5" stroke="#C47A2B" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M7.5 4.21a2 2 0 0 1 3.5-1 2 2 0 0 1 3.5 1l1 1.94" stroke="#C47A2B" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
