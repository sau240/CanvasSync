// src/App.tsx
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/routes';
import { useAuthStore } from './store/auth.store';

export default function App() {
  const initAuth = useAuthStore((state) => state.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return <RouterProvider router={router} />;
}   