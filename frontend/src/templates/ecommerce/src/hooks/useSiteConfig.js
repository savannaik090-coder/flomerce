import { useContext } from 'react';
import { SiteContext } from '../context/SiteContext.jsx';

export function useSiteConfig() {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error('useSiteConfig must be used within a SiteProvider');
  }
  return context;
}
