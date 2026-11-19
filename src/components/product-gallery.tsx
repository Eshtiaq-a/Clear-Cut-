"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/data/products";
import { Badge, Icon } from "./ui";
import { productRepository } from "@/lib/products";

export function ProductGallery({ product }: { product: Product }) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const images = product.images?.filter(Boolean) ?? (product.image ? [product.image] : []);
  const discountPercentage = productRepository.calculateDiscountPercentage(product);

  function changeImage(direction: number) {
    if (images.length < 2) return;
    setSelectedImage((current) => (current + direction + images.length) % images.length);
    setImageFailed(false);
  }

  return (
    <div className="detail-gallery">
      <div className="detail-image" aria-live="polite">
        {images.length && !imageFailed ? (
          <Image src={images[selectedImage]} alt={`${product.name} view ${selectedImage + 1}`} fill sizes="(max-width: 900px) 100vw, 520px" priority onError={() => setImageFailed(true)} style={{ objectFit: "cover" }} />
        ) : (
          <div className="missing-product-image"><Icon name="leaf" size={28} /><span>Image unavailable</span></div>
        )}
        <Badge tone={product.status === "sold-out" ? "ink" : "coral"}>{product.status === "sold-out" ? "Sold out" : `${discountPercentage}% off`}</Badge>
        {images.length > 1 && (
          <>
            <button className="gallery-nav gallery-prev" type="button" onClick={() => changeImage(-1)} aria-label="Previous product image">‹</button>
            <button className="gallery-nav gallery-next" type="button" onClick={() => changeImage(1)} aria-label="Next product image">›</button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="gallery-thumbs" aria-label="Product image gallery">
          {images.map((image, index) => (
            <button className={selectedImage === index ? "gallery-thumb active" : "gallery-thumb"} key={image} type="button" onClick={() => { setSelectedImage(index); setImageFailed(false); }} aria-label={`Show product view ${index + 1}`} aria-pressed={selectedImage === index}>
              <Image src={image} alt="" fill sizes="76px" style={{ objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
