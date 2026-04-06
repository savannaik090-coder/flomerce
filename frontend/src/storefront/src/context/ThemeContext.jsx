import React, { createContext, useContext, useMemo } from 'react';
import { useSiteConfig } from '../hooks/useSiteConfig.js';
import { getTheme, THEME_CLASSIC } from '../config/themes.js';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { siteConfig } = useSiteConfig();

  const theme = useMemo(() => {
    const themeId = siteConfig?.settings?.theme || siteConfig?.templateId || THEME_CLASSIC;
    return getTheme(themeId);
  }, [siteConfig?.settings?.theme, siteConfig?.templateId]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  const resolved = theme || getTheme(THEME_CLASSIC);
  return { ...resolved, isModern: resolved.id === 'modern' };
}
