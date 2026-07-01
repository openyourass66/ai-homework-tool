import React from 'react';
import { createRoot } from 'react-dom/client';
import { FloatingApp } from './FloatingApp';
import './styles/floating.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <FloatingApp />
  </React.StrictMode>
);
