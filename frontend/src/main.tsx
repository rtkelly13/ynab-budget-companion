import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@rtkelly13/design-system/styles.css';
import { ThemeProvider } from '@rtkelly13/design-system';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark">
      <App />
    </ThemeProvider>
  </StrictMode>,
);
