import React, { useState, useRef, useEffect } from 'react';

const SORT_OPTIONS = [
  { value: 'price-low-high', label: 'Price: Low to High' },
  { value: 'price-high-low', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
];

const PRICE_RANGES = [
  { value: 'all', label: 'All Prices' },
  { value: '0-5000', label: 'Under ₹5,000' },
  { value: '5000-15000', label: '₹5,000 - ₹15,000' },
  { value: '15000+', label: 'Above ₹15,000' },
];

export default function FilterSortBar({ onSort, onFilter, currentSort, currentFilters }) {
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [tempSort, setTempSort] = useState(currentFilters?.sort || 'featured');
  const [tempPrice, setTempPrice] = useState(currentFilters?.priceRange || 'all');
  const [tempInStock, setTempInStock] = useState(currentFilters?.inStockOnly || false);
  const sortRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSortSelect(value) {
    setSortOpen(false);
    if (onSort) onSort(value);
  }

  function handleApplyFilter() {
    if (onFilter) {
      onFilter({
        sort: tempSort,
        priceRange: tempPrice,
        inStockOnly: tempInStock,
      });
    }
    setFilterOpen(false);
  }

  function handleClearFilter() {
    setTempSort('featured');
    setTempPrice('all');
    setTempInStock(false);
    if (onFilter) {
      onFilter({ sort: 'featured', priceRange: 'all', inStockOnly: false });
    }
    setFilterOpen(false);
  }

  return (
    <>
      <div className="shop-filter-header">
        <div className="filter-option" onClick={() => setFilterOpen(true)}>FILTER</div>
        <div
          className={`sort-option${sortOpen ? ' active' : ''}`}
          onClick={() => setSortOpen(!sortOpen)}
          ref={sortRef}
        >
          <span>SORT BY</span>
          <span className="chevron">▼</span>
          <div className={`sort-dropdown${sortOpen ? ' active' : ''}`}>
            {SORT_OPTIONS.map(opt => (
              <div
                key={opt.value}
                className={`sort-dropdown-option${currentSort === opt.value ? ' active' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleSortSelect(opt.value); }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {filterOpen && (
        <div className="filter-modal-overlay" onClick={() => setFilterOpen(false)}>
          <div className="filter-modal-content" onClick={e => e.stopPropagation()}>
            <div className="filter-modal-header">
              <h2>Filter Products</h2>
              <button className="close-filter-modal" onClick={() => setFilterOpen(false)}>×</button>
            </div>
            <div className="filter-modal-body">
              <div className="filter-section">
                <h3>Sort By</h3>
                <div className="filter-options">
                  <label className="filter-option-label">
                    <input type="radio" name="filter-sort" value="featured" checked={tempSort === 'featured'} onChange={() => setTempSort('featured')} /> Featured
                  </label>
                  <label className="filter-option-label">
                    <input type="radio" name="filter-sort" value="newest" checked={tempSort === 'newest'} onChange={() => setTempSort('newest')} /> Newest
                  </label>
                </div>
              </div>
              <div className="filter-section">
                <h3>Price Range</h3>
                <div className="filter-options">
                  {PRICE_RANGES.map(range => (
                    <label key={range.value} className="filter-option-label">
                      <input type="radio" name="price-range" value={range.value} checked={tempPrice === range.value} onChange={() => setTempPrice(range.value)} />
                      {range.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="filter-section">
                <h3>Availability</h3>
                <div className="filter-options">
                  <label className="filter-option-label">
                    <input type="checkbox" checked={tempInStock} onChange={(e) => setTempInStock(e.target.checked)} /> In Stock
                  </label>
                </div>
              </div>
            </div>
            <div className="filter-modal-footer">
              <button className="apply-filter-btn" onClick={handleApplyFilter}>Apply Filters</button>
              <button className="clear-filter-btn" onClick={handleClearFilter}>Clear All</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
