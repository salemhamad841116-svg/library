import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatApp } from './ChatApp';
import '../index.css';
import './chat.css';

const rootEl = document.getElementById('chat-root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <ChatApp />
    </StrictMode>
  );
}
