import { useEffect, useState } from 'react';
import axios from 'axios';

function Filters({ filters, onFilterChange, onReset }) {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    axios
      .get('http://localhost:5000/api/categories')
      .then((res) => {
        setCategories(res.data);
      })
      .catch((err) => {
        console.error('Ошибка загрузки категорий:', err);
      });
  }, []);

  return (
    <div className="filters-container">
      <div className="filter-group filter-search">
        <label htmlFor="search-input">Поиск</label>
        <input
          id="search-input"
          type="text"
          placeholder="Поиск по названию..."
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
        />
      </div>

      <div className="filter-group filter-category">
        <label htmlFor="category-select">Категория</label>
        <select
          id="category-select"
          value={filters.category}
          onChange={(e) => onFilterChange('category', e.target.value)}
        >
          <option value="">Все категории</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group filter-price">
        <label>Диапазон цены</label>
        <div className="price-inputs">
          <input
            type="number"
            min="0"
            placeholder="Цена от"
            value={filters.minPrice}
            onChange={(e) => onFilterChange('minPrice', e.target.value)}
          />
          <span className="price-separator">—</span>
          <input
            type="number"
            min="0"
            placeholder="Цена до"
            value={filters.maxPrice}
            onChange={(e) => onFilterChange('maxPrice', e.target.value)}
          />
        </div>
      </div>

      {(filters.search || filters.category || filters.minPrice || filters.maxPrice) && (
        <div className="filter-actions">
          <button type="button" className="btn-reset" onClick={onReset}>
            Сбросить фильтры
          </button>
        </div>
      )}
    </div>
  );
}

export default Filters;
