import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { MatchProvider } from './store/MatchContext.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MatchProvider>
      <App />
    </MatchProvider>
  </React.StrictMode>,
);
