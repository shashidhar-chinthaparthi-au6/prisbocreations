export function firstNameFromFullName(fullName: string): string {
  const p = fullName.trim().split(/\s+/).filter(Boolean)[0];
  return p || "there";
}

export function initialsFromFullName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
