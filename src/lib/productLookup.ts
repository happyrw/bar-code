export type LookedUpProduct = {
  barcode: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  category: string | null;
  source: "openfoodfacts" | "upcitemdb";
};

type OpenFoodFactsResponse = {
  status: number;
  product?: {
    product_name?: string;
    product_name_en?: string;
    brands?: string;
    image_url?: string;
    image_front_url?: string;
    categories?: string;
  };
};

type UpcItemDbResponse = {
  code: string;
  items?: Array<{
    title?: string;
    brand?: string;
    images?: string[];
    category?: string;
  }>;
};

const FETCH_TIMEOUT_MS = 8000;

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function lookupOpenFoodFacts(
  barcode: string
): Promise<LookedUpProduct | null> {
  const data = await fetchJson<OpenFoodFactsResponse>(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
      barcode
    )}.json`
  );

  if (!data || data.status !== 1 || !data.product) return null;

  const name = data.product.product_name || data.product.product_name_en;
  if (!name) return null;

  return {
    barcode,
    name,
    brand: data.product.brands?.split(",")[0]?.trim() || null,
    imageUrl:
      data.product.image_front_url || data.product.image_url || null,
    category: data.product.categories?.split(",")[0]?.trim() || null,
    source: "openfoodfacts",
  };
}

async function lookupUpcItemDb(
  barcode: string
): Promise<LookedUpProduct | null> {
  const data = await fetchJson<UpcItemDbResponse>(
    `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(
      barcode
    )}`
  );

  const item = data?.items?.[0];
  if (!data || data.code !== "OK" || !item || !item.title) return null;

  return {
    barcode,
    name: item.title,
    brand: item.brand || null,
    imageUrl: item.images?.[0] || null,
    category: item.category?.split(">")[0]?.trim() || null,
    source: "upcitemdb",
  };
}

/**
 * Looks up a product by barcode, trying Open Food Facts first and
 * falling back to UPCitemdb's free trial endpoint. Both are used
 * without an API key. Returns null if neither source has a match.
 */
export async function lookupProductByBarcode(
  barcode: string
): Promise<LookedUpProduct | null> {
  const fromOff = await lookupOpenFoodFacts(barcode);
  if (fromOff) return fromOff;

  return lookupUpcItemDb(barcode);
}
