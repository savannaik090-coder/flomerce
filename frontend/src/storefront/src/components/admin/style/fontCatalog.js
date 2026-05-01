// Curated font catalog for admin style editors. Each entry's `value` is the
// exact CSS font-family stack applied to the live storefront. All Google Fonts
// referenced here are loaded once in frontend/src/storefront/index.html.
export const FONT_GROUPS = [
  {
    label: 'Sans-Serif',
    fonts: [
      { name: 'Inter',       value: "'Inter', 'Helvetica Neue', sans-serif" },
      { name: 'Poppins',     value: "'Poppins', sans-serif" },
      { name: 'Lato',        value: "'Lato', sans-serif" },
      { name: 'Montserrat',  value: "'Montserrat', sans-serif" },
      { name: 'Raleway',     value: "'Raleway', sans-serif" },
      { name: 'DM Sans',     value: "'DM Sans', sans-serif" },
      { name: 'Work Sans',   value: "'Work Sans', sans-serif" },
    ],
  },
  {
    label: 'Serif',
    fonts: [
      { name: 'Playfair Display',    value: "'Playfair Display', serif" },
      { name: 'DM Serif Display',    value: "'DM Serif Display', serif" },
      { name: 'Cormorant Garamond',  value: "'Cormorant Garamond', serif" },
      { name: 'Lora',                value: "'Lora', serif" },
      { name: 'Merriweather',        value: "'Merriweather', serif" },
    ],
  },
  {
    label: 'Display',
    fonts: [
      { name: 'Bebas Neue',     value: "'Bebas Neue', sans-serif" },
      { name: 'Oswald',         value: "'Oswald', sans-serif" },
      { name: 'Anton',          value: "'Anton', sans-serif" },
      { name: 'Abril Fatface',  value: "'Abril Fatface', serif" },
      { name: 'Righteous',      value: "'Righteous', sans-serif" },
      { name: 'Archivo Black',  value: "'Archivo Black', sans-serif" },
    ],
  },
  {
    label: 'Handwritten',
    fonts: [
      { name: 'Caveat',           value: "'Caveat', cursive" },
      { name: 'Pacifico',         value: "'Pacifico', cursive" },
      { name: 'Dancing Script',   value: "'Dancing Script', cursive" },
      { name: 'Great Vibes',      value: "'Great Vibes', cursive" },
      { name: 'Sacramento',       value: "'Sacramento', cursive" },
      { name: 'Permanent Marker', value: "'Permanent Marker', cursive" },
    ],
  },
  {
    label: 'Monospace',
    fonts: [
      { name: 'Space Mono',     value: "'Space Mono', monospace" },
      { name: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
    ],
  },
];

// Flat lookup so we can find a saved value's display name and group.
export const FONT_LOOKUP = FONT_GROUPS.flatMap(g =>
  g.fonts.map(f => ({ ...f, group: g.label }))
);
