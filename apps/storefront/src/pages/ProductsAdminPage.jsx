import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext.jsx';
import ProductForm from '../components/admin/ProductForm.jsx';
import { getProductById } from '../services/productService.js';
import '../styles/admin.css';

export default function ProductsAdminPage() {
  const { siteConfig } = useContext(SiteContext);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const productId = searchParams.get('id');
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(!!productId);
  const [error, setError] = useState('');

  useEffect(() => {
    if (productId) loadProduct();
  }, [productId]);

  async function loadProduct() {
    setLoading(true);
    try {
      const res = await getProductById(productId);
      setProduct(res.data || res.product || res);
    } catch (err) {
      setError('Failed to load product: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    navigate('/admin');
  }

  function handleCancel() {
    navigate('/admin');
  }

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#ef4444', marginBottom: 16 }}>{error}</p>
          <button className="btn btn-secondary" onClick={() => navigate('/admin')}>Back to Admin</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '120px auto 60px', padding: '0 20px' }}>
      <ProductForm
        product={product}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
}
