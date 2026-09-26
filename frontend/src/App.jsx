import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MenuPage from './MenuPage';
import LoginPage from './LoginPage';
import AdminPanel from './AdminPanel';
import ProtectedRoute from './ProtectedRoute';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Публичная страница онлайн-меню */}
        <Route path="/" element={<MenuPage />} />

        {/* Страница входа администратора */}
        <Route path="/admin/login" element={<LoginPage />} />

        {/* Защищенная панель администратора */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        {/* Перенаправление для остальных путей */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
