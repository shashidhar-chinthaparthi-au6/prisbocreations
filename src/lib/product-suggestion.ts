/** Public shape for typeahead / search suggestion API responses. */
export type ProductSuggestion = {
  slug: string;
  name: string;
  thumb: string | null;
  sku: string;
  displayPricePaise: number;
  hasPackOptions: boolean;
};
