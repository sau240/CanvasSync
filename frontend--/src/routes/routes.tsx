import { createBrowserRouter } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import DashboardPage from '../pages/Dashboard';
import LoginPage from '../pages/LoginPage';
import Profile from '../pages/Profile';
import RegisterPage from '../pages/RegisterPage';
import RoomPage from '../pages/RoomPage';

export const router = createBrowserRouter([
  // Public routes
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },

  // Protected routes wrapper
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/room/:roomId', element: <RoomPage /> },
      { path: '/profile', element: <Profile />},
      { path: '/settings', element: <Profile />},
    ],
  },

  // Fallback redirect
  { path: '*', element: <LoginPage /> },
]);