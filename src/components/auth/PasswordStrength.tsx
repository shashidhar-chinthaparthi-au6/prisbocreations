"use client";

export function getPasswordStrengthLevel(p: string): 0 | 1 | 2 | 3 | 4 {
  if (!p) return 0;
  if (p.length < 8) return 1;
  const classes = [
    /[a-z]/.test(p),
    /[A-Z]/.test(p),
    /[0-9]/.test(p),
    /[^a-zA-Z0-9]/.test(p),
  ].filter(Boolean).length;
  if (classes === 1) return 2;
  if (classes === 2) return 3;
  return 4;
}

const LABELS = ["", "Weak", "Fair", "Good", "Strong"] as const;
const COLORS = ["", "#B91C1C", "#D97706", "#D97706", "#2D6A4F"] as const;

/** @deprecated Use getPasswordStrengthLevel */
export function passwordStrength(password: string): { filled: number; label: "Weak" | "Fair" | "Good" | "Strong" } {
  const n = getPasswordStrengthLevel(password);
  if (n <= 1) return { filled: Math.max(1, n), label: "Weak" };
  const label = LABELS[n] as "Weak" | "Fair" | "Good" | "Strong";
  return { filled: n, label };
}

export type StrengthLabel = "Weak" | "Fair" | "Good" | "Strong";

export function PasswordStrength({ password }: { password: string }) {
  const strength = getPasswordStrengthLevel(password);
  if (strength === 0) return null;

  const fillColor = COLORS[strength];
  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[4px] flex-1 rounded-[2px] transition-[background-color] duration-200 ease-out"
            style={{
              backgroundColor: i < strength ? fillColor : "#E8E0D6",
            }}
          />
        ))}
      </div>
      <p
        className="text-right text-xs font-medium transition-colors duration-200"
        style={{ color: fillColor }}
      >
        {LABELS[strength]}
      </p>
    </div>
  );
}
