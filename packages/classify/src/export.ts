import { TAXONOMY } from "./taxonomy.js";

export function exportTaxonomyDocument(): {
  version: string;
  techniques: typeof TAXONOMY;
} {
  return {
    version: "1.0.0",
    techniques: TAXONOMY,
  };
}
