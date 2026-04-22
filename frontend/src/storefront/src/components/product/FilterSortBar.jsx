import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function FilterSortBar({ onSort, onFilter, currentSort, currentFilters, subcategories = [] }) {
  const { t } = useTranslation('storefront');
  const SORT_OPTIONS = [
    { value: 'price-low-high', label: t('filter.sort.priceLowHigh', 'Price: Low to High') },
    { value: 'price-high-low', label: t('filter.sort.priceHighLow', 'Price: High to Low') },
    { value: 'newest', label: t('filter.sort.newest', 'Newest') },
  ];

  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [tempSort, setTempSort] = useState(currentFilters?.sort || 'featured');
  const [tempInStock, setTempInStock] = useState(currentFilters?.inStockOnly || false);
  const [tempSubcategory, setTempSubcategory] = useState(currentFilters?.subcategoryId || '');
  const sortRef = useRef(null);

  useEffect(() => {
    setTempSort(currentFilters?.sort || 'featured');
    setTempInStock(currentFilters?.inStockOnly || false);
    setTempSubcategory(currentFilters?.subcategoryId || '');
  }, [currentFilters]);

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
        inStockOnly: tempInStock,
        subcategoryId: tempSubcategory,
      });
    }
    setFilterOpen(false);
  }

  function handleClearFilter() {
    setTempSort('featured');
    setTempInStock(false);
    setTempSubcategory('');
    if (onFilter) {
      onFilter({ sort: 'featured', inStockOnly: false, subcategoryId: '' });
    }
    setFilterOpen(false);
  }

  const allValues = subcategories.flatMap(g => (g.children && g.children.length > 0) ? g.children : [g]);
  const hasFilterOptions = allValues.length > 0;

  const activeFilterCount = [
    tempInStock,
    tempSubcategory,
  ].filter(Boolean).length;

  return (
    <>
      <div className="shop-filter-header">
        <div className="filter-option" onClick={() => setFilterOpen(true)}>
          {t('filter.filter', 'FILTER')}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </div>
        <div
          className={`sort-option${sortOpen ? ' active' : ''}`}
          onClick={() => setSortOpen(!sortOpen)}
          ref={sortRef}
        >
          <span>{t('filter.sortBy', 'SORT BY')}</span>
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
              <h2>{t('filter.filterProducts', 'Filter Products')}</h2>
              <button className="close-filter-modal" onClick={() => setFilterOpen(false)}>×</button>
            </div>
            <div className="filter-modal-body">
              <div className="filter-section">
                <h3>{t('filter.sortByHeading', 'Sort By')}</h3>
                <div className="filter-options">
                  <label className="filter-option-label">
                    <input type="radio" name="filter-sort" value="featured" checked={tempSort === 'featured'} onChange={() => setTempSort('featured')} /> {t('filter.featured', 'Featured')}
                  </label>
                  <label className="filter-option-label">
                    <input type="radio" name="filter-sort" value="newest" checked={tempSort === 'newest'} onChange={() => setTempSort('newest')} /> {t('filter.newest', 'Newest')}
                  </label>
                </div>
              </div>
              {hasFilterOptions && subcategories.map(group => {
                const values = (group.children && group.children.length > 0) ? group.children : [group];
                const isGrouped = group.children && group.children.length > 0;
                return (
                  <div className="filter-section" key={group.id}>
                    <h3>{group.name}</h3>
                    <div className="filter-options">
                      <label className="filter-option-label">
                        <input
                          type="radio"
                          name="subcategory"
                          value=""
                          checked={tempSubcategory === '' || !values.some(v => v.id === tempSubcategory)}
                          onChange={() => setTempSubcategory('')}
                        /> {t('filter.all', 'All')}
                      </label>
                      {values.map(val => (
                        <label key={val.id} className="filter-option-label">
                          <input
                            type="radio"
                            name="subcategory"
                            value={val.id}
                            checked={tempSubcategory === val.id}
                            onChange={() => setTempSubcategory(val.id)}
                          /> {val.name}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="filter-section">
                <h3>{t('filter.availability', 'Availability')}</h3>
                <div className="filter-options">
                  <label className="filter-option-label">
                    <input type="checkbox" checked={tempInStock} onChange={(e) => setTempInStock(e.target.checked)} /> {t('filter.inStock', 'In Stock')}
                  </label>
                </div>
              </div>
            </div>
            <div className="filter-modal-footer">
              <button className="apply-filter-btn" onClick={handleApplyFilter}>{t('filter.applyFilters', 'Apply Filters')}</button>
              <button className="clear-filter-btn" onClick={handleClearFilter}>{t('filter.clearAll', 'Clear All')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
