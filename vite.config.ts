// Vite configuration file
// Vite is the build tool that compiles our React app and serves it during development

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc'; // React plugin with SWC compiler (faster than Babel)

export default defineConfig({
  // Plugins: Add functionality to Vite
  // react(): Enables React support and JSX compilation
  plugins: [react()],
  
  // Development server configuration
  server: {
    port: 5173, // Port where the frontend dev server runs
    
    // Proxy: Forwards API requests to the backend
    // When frontend makes a request to /api/*, Vite forwards it to the backend
    // This avoids CORS (Cross-Origin Resource Sharing) issues during development
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // Backend server URL
        changeOrigin: true, // Changes the origin header to match the target
      },
    },
  },
});
