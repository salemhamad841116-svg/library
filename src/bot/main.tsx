import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BotApp } from './BotApp';
import '../index.css';

const rootEl = document.getElementById('bot-root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <BotApp />
    </StrictMode>
  );
}
