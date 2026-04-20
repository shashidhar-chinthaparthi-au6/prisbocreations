"use client";

export type StrengthLabel = "Weak" | "Fair" | "Good" | "Strong";

export function passwordStrength(password: string): { filled: number; label: StrengthLabel } {
  const len = password.length;
  if (len < 8) return { filled: 1, label: "Weak" };
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const onlyLetters = hasLetter && !hasDigit && !hasSpecial;
  const onlyDigits = hasDigit && !hasLetter && !hasSpecial;
  if (onlyLetters || onlyDigits) return { filled: 2, label: "Fair" };
  if (hasLetter && hasDigit && !hasSpecial) return { filled: 3, label: "Good" };
  if (hasLetter && hasDigit && hasSpecial) return { filled: 4, label: "Strong" };
  if (hasSpecial && hasLetter && hasDigit) return { filled: 4, label: "Strong" };
  if (hasLetter && hasSpecial) return { filled: 3, label: "Good" };
  if (hasDigit && hasSpecial) return { filled: 3, label: "Good" };
  return { filled: 3, label: "Good" };
}

export function PasswordStrength({ password }: { password: string }) {
  const { filled, label } = passwordStrength(password);
  const segClass = (i: number) => {
    if (i >= filled) return "bg-[#E8E0D6]";
    if (filled <= 1) return "bg-[#C94B4B]";
    if (filled <= 3) return "bg-[#D4A017]";
    return "bg-[#2D7A4E]";
  };
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${segClass(i)}`} />
        ))}
      </div>
      <span className="shrink-0 text-xs font-medium text-[#6B6560]">{label}</span>
    </div>
  );
}
