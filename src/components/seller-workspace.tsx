"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { marketplaceCategories } from "@/data/categories";
import { computeSuggestedPrice } from "@/lib/pricing";

type SellerProduct = {
  id: string;
  name: string;
  description: string;
  category: string;
  original_price: number;
  discounted_price: number;
  stock: number;
  image_url: string;
  expiry_date?: string | null;
  demand_level?: "low" | "medium" | "high" | null;
  price_floor?: number | null;
};

export function SellerWorkspace({
  isSeller,
  initialProducts = [],
}: {
  isSeller: boolean;
  initialProducts?: SellerProduct[];
}) {
  const router = useRouter();
  const [sellerEnabled, setSellerEnabled] = useState(isSeller);
  const [products, setProducts] = useState<SellerProduct[]>(initialProducts);
  const [error, setError] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    original_price: "",
    discounted_price: "",
    stock: "",
    image_url: "",
    expiry_date: "",
    demand_level: "medium",
    price_floor: "",
  });

  async function loadProducts() {
    try {
      const response = await fetch("/api/seller/products");
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Unable to load seller products");
      }
      const data = await response.json() as SellerProduct[];
      setProducts(data);
    } catch (caughtError) {
      console.error("Seller products load error:", caughtError);
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load seller products");
    }
  }

  async function becomeSeller() {
    setError("");
    setIsActivating(true);
    try {
      const response = await fetch("/api/seller/profile", { method: "PATCH" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Unable to become a seller");
      }
      setSellerEnabled(true);
      await loadProducts();
      router.refresh();
    } catch (caughtError) {
      console.error("Become seller error:", caughtError);
      setError(caughtError instanceof Error ? caughtError.message : "Unable to become a seller");
    } finally {
      setIsActivating(false);
    }
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          original_price: Number(form.original_price),
          discounted_price: Number(form.discounted_price),
          stock: Number(form.stock),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Unable to create product");
      }
      setForm({
        name: "",
        description: "",
        category: "",
        original_price: "",
        discounted_price: "",
        stock: "",
        image_url: "",
        expiry_date: "",
        demand_level: "medium",
        price_floor: "",
      });
      await loadProducts();
      router.refresh();
    } catch (caughtError) {
      console.error("Seller product create error:", caughtError);
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create product");
    } finally {
      setIsSubmitting(false);
    }
  }

  const totalProducts = products.length;
  const totalStock = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const potentialRevenue = products.reduce(
    (sum, product) => sum + Number(product.discounted_price || 0) * Number(product.stock || 0),
    0,
  );
  const lowStockCount = products.filter((product) => Number(product.stock || 0) < 5).length;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 0,
    }).format(value);

  const showSuggestedPrice =
    form.original_price !== ""
    && form.expiry_date !== ""
    && form.stock !== ""
    && form.price_floor !== "";
  const suggestedPricing = showSuggestedPrice
    ? computeSuggestedPrice({
        original_price: Number(form.original_price),
        expiry_date: form.expiry_date,
        demand_level: form.demand_level,
        stock: Number(form.stock),
        price_floor: Number(form.price_floor),
      })
    : null;

  return (
    <section className="container page-section">
      <div className="page-intro">
        <p className="eyebrow">Seller workspace</p>
        <h1>{sellerEnabled ? "Manage your products" : "Start selling"}</h1>
      </div>

      {error && <p className="auth-error seller-error" role="alert">{error}</p>}

      {!sellerEnabled ? (
        <div className="empty-state">
          <strong>Become a seller to publish products</strong>
          <span>You can activate seller mode for this account.</span>
          <button className="button button-primary" type="button" onClick={becomeSeller} disabled={isActivating}>
            {isActivating ? "Activating..." : "Become a seller"}
          </button>
        </div>
      ) : (
        <>
          <div className="stats-grid seller-stats" aria-label="Seller dashboard summary">
            <div className="stat-card"><span>Total products listed</span><strong>{totalProducts}</strong></div>
            <div className="stat-card"><span>Total stock remaining</span><strong>{totalStock}</strong></div>
            <div className="stat-card"><span>Potential revenue</span><strong>{formatCurrency(potentialRevenue)}</strong></div>
            <div className="stat-card"><span>Low stock alerts</span><strong>{lowStockCount}</strong></div>
          </div>

          <h2 className="seller-form-heading">Add a product</h2>
          <form className="seller-form" onSubmit={createProduct}>
            <label>Name<input required value={form.name} onChange={(event) => updateField("name", event.target.value)} /></label>
            <label>Description<textarea required value={form.description} onChange={(event) => updateField("description", event.target.value)} /></label>
            <label>
              Category
              <input
                required
                type="text"
                list="seller-category-options"
                value={form.category}
                onChange={(event) => updateField("category", event.target.value)}
                placeholder="Start typing a category"
              />
              <datalist id="seller-category-options">
                {marketplaceCategories
                  .filter((category) => category.slug !== "all")
                  .map((category) => (
                    <option key={category.slug} value={category.name}>{category.name}</option>
                  ))}
              </datalist>
            </label>
            <label>Original price<input required type="number" min="1" step="0.01" value={form.original_price} onChange={(event) => updateField("original_price", event.target.value)} /></label>
            <label>Discounted price<input required type="number" min="0" step="0.01" value={form.discounted_price} onChange={(event) => updateField("discounted_price", event.target.value)} /></label>
            {suggestedPricing && (
              <div className="pricing-suggestion" aria-live="polite">
                {suggestedPricing.blocked ? (
                  <>
                    <strong>Pricing blocked</strong>
                    <span>{suggestedPricing.blockedReason}</span>
                  </>
                ) : (
                  <>
                    <strong>Suggested price: {formatCurrency(suggestedPricing.suggestedPrice)}</strong>
                    <span>{suggestedPricing.discountPercent}% discount</span>
                    {suggestedPricing.reasons.map((reason) => <span key={reason}>{reason}</span>)}
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => updateField("discounted_price", String(suggestedPricing.suggestedPrice))}
                    >
                      Use suggested price
                    </button>
                  </>
                )}
              </div>
            )}
            <label>Stock<input required type="number" min="0" step="1" value={form.stock} onChange={(event) => updateField("stock", event.target.value)} /></label>
            <label>Expiry date<input required type="date" value={form.expiry_date} onChange={(event) => updateField("expiry_date", event.target.value)} /></label>
            <label>
              Demand level
              <select value={form.demand_level} onChange={(event) => updateField("demand_level", event.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label>Price floor<input required type="number" min="0" step="0.01" value={form.price_floor} onChange={(event) => updateField("price_floor", event.target.value)} /></label>
            <label className="seller-image-field">Image URL<input required type="text" value={form.image_url} onChange={(event) => updateField("image_url", event.target.value)} /></label>
            <button className="button button-primary seller-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add product"}
            </button>
          </form>

          <div className="seller-products">
            <h2>Your products</h2>
            {products.length === 0 ? (
              <div className="empty-state"><strong>No products yet</strong><span>Add your first product above.</span></div>
            ) : (
              products.map((product) => (
                <article className="seller-product-row" key={product.id}>
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image_url} alt={product.name} />
                  ) : (
                    <div className="seller-product-placeholder" aria-hidden="true">No image</div>
                  )}
                  <div className="seller-product-info">
                    <strong>{product.name}</strong>
                    <span>{product.category}</span>
                  </div>
                  <div className="seller-product-pricing">
                    <span className="seller-original-price">{formatCurrency(Number(product.original_price))}</span>
                    <strong>{formatCurrency(Number(product.discounted_price))}</strong>
                  </div>
                  <div className="seller-product-stock">
                    <span>Stock</span>
                    <strong>{product.stock}</strong>
                  </div>
                </article>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}
