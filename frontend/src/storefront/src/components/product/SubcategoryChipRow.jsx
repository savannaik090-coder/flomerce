import React from 'react';
import TranslatedText from '../TranslatedText.jsx';

export default function SubcategoryChipRow({ subcategories = [], activeId = '', onSelect }) {
  const flat = subcategories.flatMap(g =>
    (g.children && g.children.length > 0) ? g.children : [g]
  );

  if (flat.length === 0) return null;

  function handleClick(id) {
    if (onSelect) onSelect(id);
  }

  return (
    <div className="subcategory-chip-row-wrap" role="navigation" aria-label="Subcategory filter">
      <div className="subcategory-chip-row">
        <button
          type="button"
          className={`subcategory-chip${!activeId ? ' active' : ''}`}
          onClick={() => handleClick('')}
          aria-pressed={!activeId}
        >
          <TranslatedText text="All" />
        </button>
        {flat.map(s => (
          <button
            key={s.id}
            type="button"
            className={`subcategory-chip${activeId === s.id ? ' active' : ''}`}
            onClick={() => handleClick(s.id)}
            aria-pressed={activeId === s.id}
          >
            <TranslatedText text={s.name} />
          </button>
        ))}
      </div>
    </div>
  );
}
