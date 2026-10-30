import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/bricolage-grotesque/index.css';
import '@fontsource-variable/public-sans/index.css';
import App from './App';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
