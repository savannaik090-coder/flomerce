import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    dedupe: ['react', 'react-dom', 'i18next', 'react-i18next', 'i18next-browser-languagedetector'],
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime.js'),
      i18next: path.resolve(__dirname, 'node_modules/i18next'),
      'react-i18next': path.resolve(__dirname, 'node_modules/react-i18next'),
      'i18next-browser-languagedetector': path.resolve(__dirname, 'node_modules/i18next-browser-languagedetector'),
    },
  },

  build: {
    outDir: path.resolve(__dirname, '../../storefront'),
    emptyOutDir: false,
  },

  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    port: 5173,
  },
});
