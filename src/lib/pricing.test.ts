import test from "node:test";
import assert from "node:assert/strict";
import { computeSuggestedPrice } from "./pricing.ts";

function dateFromToday(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

test("expired product is blocked", () => {
  const result = computeSuggestedPrice({
    original_price: 100,
    expiry_date: dateFromToday(-1),
    demand_level: "medium",
    stock: 10,
    price_floor: 50,
  });
  assert.equal(result.blocked, true);
  assert.equal(result.blockedReason, "Product has expired and cannot be sold");
  assert.equal(result.discountPercent, 0);
});

test("zero stock is blocked", () => {
  const result = computeSuggestedPrice({
    original_price: 100,
    expiry_date: dateFromToday(30),
    demand_level: "medium",
    stock: 0,
    price_floor: 50,
  });
  assert.equal(result.blocked, true);
  assert.equal(result.blockedReason, "Out of stock");
  assert.equal(result.discountPercent, 0);
});

test("negative and zero original prices are blocked", () => {
  for (const originalPrice of [0, -10]) {
    const result = computeSuggestedPrice({
      original_price: originalPrice,
      expiry_date: dateFromToday(30),
      demand_level: "medium",
      stock: 10,
      price_floor: 50,
    });
    assert.equal(result.blocked, true);
    assert.equal(result.blockedReason, "Invalid original price");
    assert.equal(result.suggestedPrice, 0);
  }
});

test("missing expiry date uses stock and demand fallback", () => {
  const result = computeSuggestedPrice({
    original_price: 100,
    expiry_date: null,
    demand_level: "low",
    stock: 30,
    price_floor: 50,
  });
  assert.equal(result.blocked, false);
  assert.equal(result.discountPercent, 25);
  assert.ok(result.reasons.includes("No expiry date set — discount based on stock/demand only"));
});

test("missing sales velocity skips velocity adjustment", () => {
  const result = computeSuggestedPrice({
    original_price: 100,
    expiry_date: dateFromToday(30),
    demand_level: "medium",
    stock: 5,
    price_floor: 50,
  });
  assert.equal(result.blocked, false);
  assert.equal(result.discountPercent, 10);
  assert.equal(result.suggestedPrice, 90);
});

test("price floor is enforced", () => {
  const result = computeSuggestedPrice({
    original_price: 100,
    expiry_date: dateFromToday(30),
    demand_level: "medium",
    stock: 5,
    price_floor: 95,
  });
  assert.equal(result.suggestedPrice, 95);
  assert.ok(result.reasons.includes("Price floor applied — cannot go lower than seller's minimum"));
});

test("high stock, low demand and near expiry are critical risk", () => {
  const result = computeSuggestedPrice({
    original_price: 100,
    expiry_date: dateFromToday(1),
    demand_level: "low",
    stock: 32,
    price_floor: 20,
    salesVelocity: 1,
  });
  assert.equal(result.discountPercent, 65);
  assert.equal(result.urgencyLevel, "critical");
  assert.ok(result.riskScore > 80);
});

test("low stock, high demand and far expiry are low risk", () => {
  const result = computeSuggestedPrice({
    original_price: 100,
    expiry_date: dateFromToday(30),
    demand_level: "high",
    stock: 5,
    price_floor: 50,
  });
  assert.equal(result.discountPercent, 5);
  assert.equal(result.urgencyLevel, "low");
  assert.ok(result.riskScore >= 0 && result.riskScore <= 35);
});
