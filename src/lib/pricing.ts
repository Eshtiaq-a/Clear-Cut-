export type DemandLevel = "low" | "medium" | "high";

export type PricingProduct = {
  original_price?: number | null;
  expiry_date?: string | null;
  demand_level?: DemandLevel | string | null;
  stock?: number | null;
  price_floor?: number | null;
  salesVelocity?: number | null;
  category?: string | null;
};

export type PricingResult = {
  blocked: boolean;
  blockedReason?: string;
  discountPercent: number;
  suggestedPrice: number;
  reasons: string[];
  riskScore: number;
  urgencyLevel: "low" | "medium" | "high" | "critical";
  isEstimate: true;
};

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.min(maximum, value));
}

function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.max(0, value) * 100) / 100;
}

function calculateUrgency(
  riskScore: number,
  daysToExpiry: number | null,
): "low" | "medium" | "high" | "critical" {
  if ((daysToExpiry !== null && daysToExpiry <= 1) || riskScore > 80) {
    return "critical";
  }
  if (riskScore > 60 || (daysToExpiry !== null && daysToExpiry <= 3)) {
    return "high";
  }
  if (riskScore > 35) return "medium";
  return "low";
}

export function computeSuggestedPrice(product: PricingProduct): PricingResult {
  const originalPrice = Number(product.original_price);
  const stock = Number.isFinite(Number(product.stock))
    ? Math.max(0, Number(product.stock))
    : 0;
  const priceFloor = Number.isFinite(Number(product.price_floor))
    ? Math.max(0, Number(product.price_floor))
    : 0;
  const salesVelocity = product.salesVelocity == null
    ? null
    : Number(product.salesVelocity);
  const reasons: string[] = [];

  let daysToExpiry: number | null = null;

  if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
    return {
      blocked: true,
      blockedReason: "Invalid original price",
      discountPercent: 0,
      suggestedPrice: 0,
      reasons: ["Invalid original price"],
      riskScore: 100,
      urgencyLevel: "critical",
      isEstimate: true,
    };
  }

  if (stock <= 0) {
    return {
      blocked: true,
      blockedReason: "Out of stock",
      discountPercent: 0,
      suggestedPrice: roundCurrency(originalPrice),
      reasons: ["Out of stock"],
      riskScore: 100,
      urgencyLevel: "critical",
      isEstimate: true,
    };
  }

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
          suggestedPrice: roundCurrency(originalPrice),
          reasons: ["Expired products cannot receive a suggested price"],
          riskScore: 100,
          urgencyLevel: "critical",
          isEstimate: true,
        };
      }
    }
  }

  let discountPercent = 0;
  if (daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 2) {
    discountPercent = 40;
    reasons.push(`${daysToExpiry} ${daysToExpiry === 1 ? "day" : "days"} to expiry → 40% base discount`);
  } else if (daysToExpiry !== null && daysToExpiry >= 3 && daysToExpiry <= 7) {
    discountPercent = 25;
    reasons.push(`${daysToExpiry} days to expiry → 25% base discount`);
  } else if (daysToExpiry !== null && daysToExpiry > 7) {
    discountPercent = 10;
    reasons.push(`${daysToExpiry} days to expiry → 10% base discount`);
  } else if (daysToExpiry === null) {
    reasons.push("No expiry date set — discount based on stock/demand only");
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

  discountPercent = clamp(discountPercent, 0, 80);

  let suggestedPrice = originalPrice * (1 - discountPercent / 100);
  if (suggestedPrice < priceFloor) {
    suggestedPrice = priceFloor;
    reasons.push("Price floor applied — cannot go lower than seller's minimum");
  }

  if (priceFloor > 0 && originalPrice > priceFloor * 5) {
    reasons.push("Warning: original price seems unusually high relative to floor — review for accuracy");
  }

  // Risk weights: expiry urgency 50 points, stock pressure 25, low demand 25,
  // and low sales-velocity coverage 25. The total is clamped to 0-100.
  let expiryRisk = 10;
  if (daysToExpiry !== null) {
    if (daysToExpiry <= 1) expiryRisk = 50;
    else if (daysToExpiry <= 3) expiryRisk = 40;
    else if (daysToExpiry <= 7) expiryRisk = 25;
  }

  const stockRisk = stock > 20 ? 25 : stock > 10 ? 15 : 5;
  const demandRisk = product.demand_level === "low"
    ? 25
    : product.demand_level === "medium"
      ? 10
      : 0;

  let velocityRisk = 0;
  if (salesVelocity != null && Number.isFinite(salesVelocity) && salesVelocity >= 0) {
    if (salesVelocity === 0) {
      velocityRisk = 25;
    } else {
      const daysOfCover = stock / salesVelocity;
      if (daysOfCover <= 3) velocityRisk = 25;
      else if (daysOfCover <= 7) velocityRisk = 15;
      else if (daysOfCover <= 14) velocityRisk = 8;
    }
  }

  const riskScore = clamp(
    expiryRisk + stockRisk + demandRisk + velocityRisk,
    0,
    100,
  );

  return {
    blocked: false,
    discountPercent,
    suggestedPrice: roundCurrency(suggestedPrice),
    reasons,
    riskScore,
    urgencyLevel: calculateUrgency(riskScore, daysToExpiry),
    isEstimate: true,
  };
}
