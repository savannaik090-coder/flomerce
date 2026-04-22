import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { SiteProvider } from './context/SiteContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { WishlistProvider } from './context/WishlistContext.jsx';
import { CurrencyProvider } from './context/CurrencyContext.jsx';
import { PanelProvider } from './context/PanelContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ShopperTranslationProvider } from './context/ShopperTranslationContext.jsx';
import { initStorefrontI18n } from '../../shared/i18n/init.js';
import './styles/global.css';

initStorefrontI18n().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <SiteProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <CurrencyProvider>
                  <PanelProvider>
                    <ThemeProvider>
                      <ShopperTranslationProvider>
                        <App />
                      </ShopperTranslationProvider>
                    </ThemeProvider>
                  </PanelProvider>
                </CurrencyProvider>
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </SiteProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
});
