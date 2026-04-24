import React, { useState, useRef, useEffect, useCallback } from 'react';
import { COUNTRIES, COUNTRY_FLAGS, getDialCode } from '../../utils/countryStates.js';
import TranslatedText from '../TranslatedText';

const sortedCountries = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));

function extractLocalNumber(fullValue, dial) {
  if (!fullValue) return '';
  if (fullValue.startsWith(dial)) return fullValue.slice(dial.length);
  const digits = fullValue.replace(/[^0-9]/g, '');
  const dialDigits = dial.replace(/[^0-9]/g, '');
  if (dialDigits && digits.startsWith(dialDigits)) return digits.slice(dialDigits.length);
  return digits;
}

export default function PhoneInput({ value, onChange, countryCode, error, style }) {
  const [selectedCC, setSelectedCC] = useState(countryCode || 'IN');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);
  const searchRef = useRef(null);
  const prevCountryRef = useRef(countryCode);

  const dialCode = getDialCode(selectedCC);
  const flag = COUNTRY_FLAGS[selectedCC] || '';

  useEffect(() => {
    if (countryCode && countryCode !== prevCountryRef.current) {
      prevCountryRef.current = countryCode;
      const oldDial = getDialCode(selectedCC);
      const local = extractLocalNumber(value, oldDial);
      setSelectedCC(countryCode);
      const newDial = getDialCode(countryCode);
      onChange(newDial + local);
    }
  }, [countryCode]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (dropdownOpen && searchRef.current) searchRef.current.focus();
  }, [dropdownOpen]);

  const filtered = search.trim()
    ? sortedCountries.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dial.includes(search) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : sortedCountries;

  const handleSelect = useCallback((country) => {
    const oldDial = getDialCode(selectedCC);
    const local = extractLocalNumber(value, oldDial);
    setSelectedCC(country.code);
    setDropdownOpen(false);
    setSearch('');
    onChange(country.dial + local);
  }, [selectedCC, value, onChange]);

  const handlePhoneChange = useCallback((e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    onChange(dialCode + raw);
  }, [dialCode, onChange]);

  const localNumber = extractLocalNumber(value, dialCode);
  const borderColor = error ? '#e74c3c' : '#ddd';

  return (
    <div ref={wrapperRef} style={{ position: 'relative', ...style }}>
      <div style={{ display: 'flex', border: `1px solid ${borderColor}`, borderRadius: 4, overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '8px 10px', background: '#f8f8f8', border: 'none', borderInlineEnd: '1px solid #ddd',
            cursor: 'pointer', fontSize: 14, color: '#333', minWidth: 85, whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 18 }}>{flag}</span>
          <span>{dialCode}</span>
          <span style={{ fontSize: 10, marginInlineStart: 2, color: '#999' }}>▼</span>
        </button>
        <input
          type="tel"
          value={localNumber}
          onChange={handlePhoneChange}
          placeholder=<TranslatedText text="Phone number" />
          style={{
            flex: 1, padding: '10px 12px', border: 'none', outline: 'none',
            fontSize: 14, minWidth: 0, boxSizing: 'border-box',
          }}
        />
      </div>

      {dropdownOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
          background: '#fff', border: '1px solid #ddd', borderRadius: 4,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: 250, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid #eee' }}>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder=<TranslatedText text="Search country..." />
              style={{
                width: '100%', padding: '8px 10px', border: '1px solid #ddd',
                borderRadius: 4, fontSize: 13, boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 200 }}>
            {filtered.map(c => (
              <div
                key={c.code}
                onClick={() => handleSelect(c)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                  background: c.code === selectedCC ? '#f0f7ff' : 'transparent',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                onMouseLeave={e => e.currentTarget.style.background = c.code === selectedCC ? '#f0f7ff' : 'transparent'}
              >
                <span style={{ fontSize: 16 }}>{COUNTRY_FLAGS[c.code] || ''}</span>
                <span style={{ flex: 1 }}>{c.name}</span>
                <span style={{ color: '#666' }}>{c.dial}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '12px', color: '#999', textAlign: 'center', fontSize: 13 }}><TranslatedText text="No countries found" /></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
