import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './LoginPage';
import MainLayout from './components/MainLayout';
import AddOrderPage from './pages/AddOrderPage';
import OrdersListPage from './pages/OrdersListPage';
import OrderDetailsPage from './pages/OrderDetailsPage';
import StatisticsPage from './pages/StatisticsPage';
import EditOrderPage from './pages/EditOrderPage';
import NoestTrackingPage from './pages/NoestTrackingPage';
import LocationsPage from './pages/LocationsPage';
import { UIProvider } from './context/UIContext';
import { AppDataProvider } from './context/AppDataContext';
import { StatesProvider } from './context/StatesContext';
import { useEffect } from 'react';

// Utility to check if JWT is expired
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const { exp } = JSON.parse(jsonPayload);
    return Date.now() >= exp * 1000;
  } catch (e) {
    return true;
  }
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  // Check token validity
  if (!token || isTokenExpired(token) || !role) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Public Route Component (redirect to /commandes if already logged in)
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  // If user is authenticated and token is valid, redirect to orders page
  if (token && !isTokenExpired(token) && role) {
    return <Navigate to="/commandes" replace />;
  }

  // If token exists but expired, clean it up
  if (token) {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  }

  return children;
};

function App() {

  return (
    <UIProvider>
      <AppDataProvider>
        <StatesProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Login Route */}
              <Route path="/" element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              } />

              {/* Protected Routes nested under Main Layout */}
              <Route element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                <Route path="/AjouterCommande" element={<AddOrderPage />} />
                <Route path="/commandes" element={<OrdersListPage />} />
                <Route path="/statistique" element={<StatisticsPage />} />
                <Route path="/commandes/details/:id" element={<OrderDetailsPage />} />
                <Route path="/commandes/modifier/:id" element={<EditOrderPage />} />
                <Route path="/noest-express-service" element={<NoestTrackingPage />} />
                <Route path="/locations" element={<LocationsPage />} />
              </Route>

              {/* Catch all - Redirect to Login */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </StatesProvider>
      </AppDataProvider>
    </UIProvider>
  );
}

export default App;
