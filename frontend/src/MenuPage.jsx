import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Filters from './Filters';
import DishCard from './DishCard';

function MenuPage() {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    category: '',
    minPrice: '',
    maxPrice: '',
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: '',
      minPrice: '',
      maxPrice: '',
    });
  };

  useEffect(() => {
    const fetchDishes = async () => {
      setLoading(true);
      setError(null);

      // Формируем query-параметры (только непустые значения)
      const params = {};
      if (filters.category !== '') {
        params.category = filters.category;
      }
      if (filters.search.trim() !== '') {
        params.search = filters.search.trim();
      }
      if (filters.minPrice !== '') {
        params.minPrice = filters.minPrice;
      }
      if (filters.maxPrice !== '') {
        params.maxPrice = filters.maxPrice;
      }

      try {
        const response = await axios.get('http://localhost:5000/api/dishes', { params });
        setDishes(response.data);
      } catch (err) {
        console.error('Ошибка при загрузке блюд:', err);
        setError('Не удалось загрузить блюда. Убедитесь, что сервер запущен.');
      } finally {
        setLoading(false);
      }
    };

    fetchDishes();
  }, [filters]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1 className="app-title">Онлайн-меню</h1>
            <p className="app-subtitle">Выбирайте свежие и вкусные блюда</p>
          </div>
          <Link to="/admin" className="btn-admin-link">
            Вход в админку →
          </Link>
        </div>
      </header>

      <main className="app-main">
        <Filters
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
        />

        {loading ? (
          <div className="status-message">
            <div className="spinner"></div>
            <p>Загрузка блюд...</p>
          </div>
        ) : error ? (
          <div className="status-message status-error">
            <p>{error}</p>
            <button
              type="button"
              className="btn-retry"
              onClick={() => setFilters((prev) => ({ ...prev }))}
            >
              Попробовать снова
            </button>
          </div>
        ) : dishes.length === 0 ? (
          <div className="status-message status-empty">
            <p>По выбранным фильтрам ничего не найдено</p>
            <button type="button" className="btn-reset" onClick={handleResetFilters}>
              Сбросить фильтры
            </button>
          </div>
        ) : (
          <div className="dishes-grid">
            {dishes.map((dish) => (
              <DishCard key={dish.id} dish={dish} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default MenuPage;
