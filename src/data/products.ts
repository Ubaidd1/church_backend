export type CatalogProduct = {
  id: string;
  name: string;
  /** Unit price in dollars (server-authoritative). */
  unitPrice: number;
  /** Available stock. */
  stock: number;
};

/**
 * Server-side product catalog.
 * Prices here are authoritative — never trust client-sent unit prices.
 * Keep in sync with church_01/data/products.ts
 */
export const productCatalog: CatalogProduct[] = [
  {
    id: "1",
    name: "Acid Wash Overflow Crewneck",
    unitPrice: 39.99,
    stock: 24,
  },
];

export function getCatalogProductById(id: string): CatalogProduct | undefined {
  return productCatalog.find((product) => product.id === id);
}
