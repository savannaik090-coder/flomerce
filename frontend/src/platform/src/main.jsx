import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import sharedI18n, { initI18n } from '../../shared/i18n/init.js';
import './styles/platform.css';

import i18nInstance from 'i18next';
window.__i18nDbg = { start: Date.now() };
const dbgEl = document.createElement('pre');
dbgEl.id = 'i18n-dbg';
dbgEl.style.cssText = 'position:fixed;top:0;left:0;z-index:99999;background:#000;color:#0f0;font-size:11px;padding:6px;max-width:600px;white-space:pre-wrap';
document.body.appendChild(dbgEl);
const writeDbg = (msg) => { dbgEl.textContent = (dbgEl.textContent + '\n' + msg).slice(-1500); };
writeDbg('start');
let p;
try { p = initI18n(); writeDbg('initI18n called, isPromise=' + (!!p && typeof p.then==='function')); }
catch (e) { writeDbg('initI18n THREW: ' + (e && (e.stack||e.message||e))); p = Promise.resolve(); }
p.then(
  () => { writeDbg('resolved. mainInst.isInit=' + i18nInstance.isInitialized + ' sharedInst.isInit=' + sharedI18n.isInitialized + ' sameRef=' + (i18nInstance===sharedI18n) + ' sharedLang=' + sharedI18n.language); },
  (e) => { writeDbg('REJECTED: ' + String(e && (e.stack || e.message || e))); }
).finally(() => {
  writeDbg('mounting react. isInit=' + i18nInstance.isInitialized);
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
});
