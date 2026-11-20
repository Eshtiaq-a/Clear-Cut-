export type DemandLevel = "low" | "medium" | "high";

export type PricingProduct = {
  original_price: number;
  expiry_date?: string | null;
  demand_level?: DemandLevel | string | null;
  stock: number;
  price_floor: number;
};

export type PricingResult = {
  blocked: boolean;
  blockedReason?: string;
  discountPercent: number;
  suggestedPrice: number;
  reasons: string[];
};

export function computeSuggestedPrice(product: PricingProduct): PricingResult {
  const originalPrice = Number(product.original_price) || 0;
  const stock = Math.max(0, Number(product.stock) || 0);
  const priceFloor = Math.max(0, Number(product.price_floor) || 0);
  const reasons: string[] = [];

  let daysToExpiry: number | null = null;
  if (product.expiry_date) {
    const expiry = new Date(`${product.expiry_date}T00:00:00Z`);
    const today = new Date();
    const todayUtc = Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
    );
    if (!Number.isNaN(expiry.getTime())) {
      const expiryUtc = expiry.getTime();
      daysToExpiry = Math.ceil((expiryUtc - todayUtc) / 86_400_000);

      if (daysToExpiry < 0) {
        return {
          blocked: true,
          blockedReason: "Product has expired and cannot be sold",
          discountPercent: 0,
          suggestedPrice: originalPrice,
          reasons: ["Expired products cannot receive a suggested price"],
        };
      }
    }
  }

  let discountPercent = 10;
  if (daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 2) {
    discountPercent = 40;
    reasons.push(`${daysToExpiry} ${daysToExpiry === 1 ? "day" : "days"} to expiry → 40% base discount`);
  } else if (daysToExpiry !== null && daysToExpiry >= 3 && daysToExpiry <= 7) {
    discountPercent = 25;
    reasons.push(`${daysToExpiry} days to expiry → 25% base discount`);
  } else if (daysToExpiry === null || daysToExpiry > 7) {
    discountPercent = 10;
    reasons.push(daysToExpiry === null
      ? "No expiry date provided → 10% base discount"
      : `${daysToExpiry} days to expiry → 10% base discount`);
  }

  if (stock > 20) {
    discountPercent += 10;
    reasons.push(`High stock (${stock} units) → +10%`);
  }

  if (product.demand_level === "low") {
    discountPercent += 15;
    reasons.push("Low demand → +15%");
  } else if (product.demand_level === "high") {
    discountPercent -= 5;
    reasons.push("High demand → -5%");
  }

  discountPercent = Math.max(0, Math.min(80, discountPercent));

  let suggestedPrice = originalPrice * (1 - discountPercent / 100);
  if (suggestedPrice < priceFloor) {
    suggestedPrice = priceFloor;
    reasons.push("Price floor applied — cannot go lower than seller's minimum");
  }

  if (priceFloor > 0 && originalPrice > priceFloor * 5) {
    reasons.push("Warning: original price seems unusually high relative to floor — review for accuracy");
  }

  return {
    blocked: false,
    discountPercent,
    suggestedPrice: Math.round(suggestedPrice * 100) / 100,
    reasons,
  };
}
