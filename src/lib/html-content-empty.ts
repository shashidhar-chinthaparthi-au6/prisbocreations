/** True when HTML has no meaningful text (handles empty TipTap output). */
export function isHtmlContentEmpty(html: string): boolean {
  const noTags = html.replace(/<[^>]+>/g, " ");
  const decoded = noTags
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .trim();
  return decoded.length === 0;
}
