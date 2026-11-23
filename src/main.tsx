import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

(window as unknown as {__ebookfyBooted?: boolean}).__ebookfyBooted = true;

try {
  registerSW({immediate: true});
} catch {
  // Ignored in environments without Service Worker support
}

createRoot(document.getElementById('root')!).render(<App />);
