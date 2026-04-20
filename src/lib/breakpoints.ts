/** Named breakpoints — use in JS/media queries; pair with Tailwind `screens` in tailwind.config.ts */
export const BP = {
  xs: 320,
  sm: 375,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
} as const;

export type BreakpointName = keyof typeof BP;
