import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './LoginPage';
import MainLayout from './components/MainLayout';
import AddOrderPage from './pages/AddOrderPage';
import OrdersListPage from './pages/OrdersListPage';
import OrderDetailsPage from './pages/OrderDetailsPage';
import StatisticsPage from './pages/StatisticsPage';
import EditOrderPage from './pages/EditOrderPage';
import NoestTrackingPage from './pages/NoestTrackingPage';
import { UIProvider } from './context/UIContext';

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

  if (!token || isTokenExpired(token)) {
    // Clean up if expired
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    return <Navigate to="/" replace />;
  }
  return children;
};

// Public Route (redirects to /statistique if already logged in AND valid)
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');

  if (token && !isTokenExpired(token)) {
    return <Navigate to="/statistique" replace />;
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
            <Route path="/modifier/:id" element={<EditOrderPage />} />
            <Route path="/noest-express-service" element={<NoestTrackingPage />} />
          </Route>

          {/* Catch all - Redirect to Login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </UIProvider>
  );
}

export default App;
