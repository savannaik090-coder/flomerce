export function isInStock(product) {
  if (!product) return false;
  if (product.stock === undefined || product.stock === null) return true;
  return product.stock > 0;
}

export function getStockStatus(product) {
  if (!product) return { inStock: false, label: 'Unavailable', className: 'out-of-stock' };
  if (product.stock === undefined || product.stock === null) {
    return { inStock: true, label: 'In Stock', className: 'in-stock' };
  }
  if (product.stock <= 0) {
    return { inStock: false, label: 'Out of Stock', className: 'out-of-stock' };
  }
  if (product.stock <= 5) {
    return { inStock: true, label: `Only ${product.stock} left`, className: 'low-stock' };
  }
  return { inStock: true, label: 'In Stock', className: 'in-stock' };
}

export function canAddToCart(product, requestedQty = 1) {
  if (!isInStock(product)) return false;
  if (product.stock !== undefined && product.stock !== null) {
    return requestedQty <= product.stock;
  }
  return true;
}
