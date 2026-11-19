export default function ProductLoading() {
  return (
    <main className="container product-detail" aria-busy="true" aria-label="Loading product">
      <div className="detail-loading-gallery" />
      <div className="detail-loading-copy"><div /><div /><div /><div /></div>
    </main>
  );
}
