import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function AdminPanel() {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'dishes'
  const [categories, setCategories] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorAlert, setErrorAlert] = useState('');
  const [successAlert, setSuccessAlert] = useState('');

  // Состояния для категории
  const [categoryName, setCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null); // null или объект категории

  // Состояния для блюда
  const [dishName, setDishName] = useState('');
  const [dishPrice, setDishPrice] = useState('');
  const [dishCategoryId, setDishCategoryId] = useState('');
  const [dishPhoto, setDishPhoto] = useState(null);
  const [editingDish, setEditingDish] = useState(null); // null или объект блюда
  const fileInputRef = useRef(null);

  const navigate = useNavigate();

  // Получение заголовка авторизации
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  // Обработка 401 ошибки (если токен протух)
  const handleAuthError = (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('token');
      navigate('/admin/login');
    } else {
      const msg = err.response?.data?.error || err.message || 'Произошла ошибка при выполнении операции';
      setErrorAlert(msg);
    }
  };

  const showSuccess = (msg) => {
    setSuccessAlert(msg);
    setErrorAlert('');
    setTimeout(() => setSuccessAlert(''), 4000);
  };

  // Загрузка категорий
  const fetchCategories = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/categories');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Загрузка блюд
  const fetchDishes = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/dishes');
      setDishes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchCategories(), fetchDishes()]).finally(() => setLoading(false));
  }, []);

  // Выход из системы
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/admin/login');
  };

  // ===================== ДЕЙСТВИЯ С КАТЕГОРИЯМИ =====================

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setErrorAlert('');

    if (!categoryName.trim()) {
      setErrorAlert('Название категории обязательно');
      return;
    }

    try {
      if (editingCategory) {
        // Редактирование
        await axios.put(
          `http://localhost:5000/api/categories/${editingCategory.id}`,
          { name: categoryName.trim() },
          getAuthHeaders()
        );
        showSuccess('Категория успешно обновлена');
      } else {
        // Создание
        await axios.post(
          'http://localhost:5000/api/categories',
          { name: categoryName.trim() },
          getAuthHeaders()
        );
        showSuccess('Категория успешно добавлена');
      }

      setCategoryName('');
      setEditingCategory(null);
      await fetchCategories();
      await fetchDishes(); // Обновить категории и у блюд
    } catch (err) {
      handleAuthError(err);
    }
  };

  const handleStartEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setErrorAlert('');
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Вы действительно хотите удалить эту категорию?')) return;
    setErrorAlert('');

    try {
      await axios.delete(`http://localhost:5000/api/categories/${id}`, getAuthHeaders());
      showSuccess('Категория успешно удалена');
      if (editingCategory && editingCategory.id === id) {
        handleCancelEditCategory();
      }
      await fetchCategories();
      await fetchDishes();
    } catch (err) {
      handleAuthError(err);
    }
  };

  // ===================== ДЕЙСТВИЯ С БЛЮДАМИ =====================

  const handleSaveDish = async (e) => {
    e.preventDefault();
    setErrorAlert('');

    // Валидация на фронтенде
    if (!dishName.trim()) {
      setErrorAlert('Поле "Название" обязательно для заполнения');
      return;
    }

    if (!dishCategoryId) {
      setErrorAlert('Поле "Категория" обязательно для заполнения');
      return;
    }

    const priceNum = parseFloat(dishPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorAlert('Цена должна быть положительным числом');
      return;
    }

    // Подготовка FormData для отправки файлов и полей
    const formData = new FormData();
    formData.append('name', dishName.trim());
    formData.append('price', priceNum);
    formData.append('category_id', dishCategoryId);
    if (dishPhoto) {
      formData.append('photo', dishPhoto);
    }

    try {
      if (editingDish) {
        // Редактирование
        await axios.put(
          `http://localhost:5000/api/dishes/${editingDish.id}`,
          formData,
          getAuthHeaders()
        );
        showSuccess('Блюдо успешно обновлено');
      } else {
        // Добавление
        await axios.post(
          'http://localhost:5000/api/dishes',
          formData,
          getAuthHeaders()
        );
        showSuccess('Блюдо успешно добавлено');
      }

      handleCancelEditDish();
      await fetchDishes();
    } catch (err) {
      handleAuthError(err);
    }
  };

  const handleStartEditDish = (dish) => {
    setEditingDish(dish);
    setDishName(dish.name);
    setDishPrice(dish.price);
    setDishCategoryId(dish.category_id);
    setDishPhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setErrorAlert('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditDish = () => {
    setEditingDish(null);
    setDishName('');
    setDishPrice('');
    setDishCategoryId('');
    setDishPhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteDish = async (id) => {
    if (!window.confirm('Вы действительно хотите удалить это блюдо?')) return;
    setErrorAlert('');

    try {
      await axios.delete(`http://localhost:5000/api/dishes/${id}`, getAuthHeaders());
      showSuccess('Блюдо успешно удалено');
      if (editingDish && editingDish.id === id) {
        handleCancelEditDish();
      }
      await fetchDishes();
    } catch (err) {
      handleAuthError(err);
    }
  };

  // Формирование ссылки на фото для превью в таблице
  const getPhotoUrl = (photo) => {
    if (!photo) return null;
    if (photo.startsWith('http://') || photo.startsWith('https://')) return photo;
    const cleanPath = photo.startsWith('/') ? photo : `/${photo}`;
    return `http://localhost:5000${cleanPath}`;
  };

  return (
    <div className="admin-container">
      {/* Шапка админ-панели */}
      <header className="admin-header">
        <div className="admin-header-title">
          <h2>Панель администратора</h2>
          <span className="admin-badge">Admin</span>
        </div>
        <div className="admin-header-actions">
          <Link to="/" className="btn btn-secondary">
            ← Просмотр меню
          </Link>
          <button type="button" onClick={handleLogout} className="btn btn-danger">
            Выйти
          </button>
        </div>
      </header>

      {/* Уведомления об ошибке или успехе */}
      {errorAlert && (
        <div className="alert alert-error">
          <span>{errorAlert}</span>
          <button type="button" className="alert-close" onClick={() => setErrorAlert('')}>
            ✕
          </button>
        </div>
      )}
      {successAlert && (
        <div className="alert alert-success">
          <span>{successAlert}</span>
          <button type="button" className="alert-close" onClick={() => setSuccessAlert('')}>
            ✕
          </button>
        </div>
      )}

      {/* Вкладки переключения */}
      <div className="admin-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('categories');
            setErrorAlert('');
          }}
        >
          Категории ({categories.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'dishes' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('dishes');
            setErrorAlert('');
          }}
        >
          Блюда ({dishes.length})
        </button>
      </div>

      {loading ? (
        <div className="status-message">
          <div className="spinner"></div>
          <p>Загрузка данных...</p>
        </div>
      ) : activeTab === 'categories' ? (
        /* ================= ВКЛАДКА КАТЕГОРИЙ ================= */
        <div className="admin-section">
          <div className="admin-card form-card">
            <h3>{editingCategory ? 'Редактировать категорию' : 'Добавить категорию'}</h3>
            <form onSubmit={handleSaveCategory} className="admin-inline-form">
              <div className="form-group flex-grow">
                <label htmlFor="cat-name">Название категории *</label>
                <input
                  id="cat-name"
                  type="text"
                  placeholder="Например: Десерты, Супы, Напитки"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                />
              </div>
              <div className="form-buttons">
                <button type="submit" className="btn btn-primary">
                  {editingCategory ? 'Сохранить' : 'Добавить'}
                </button>
                {editingCategory && (
                  <button
                    type="button"
                    onClick={handleCancelEditCategory}
                    className="btn btn-secondary"
                  >
                    Отмена
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="admin-card table-card">
            <h3>Существующие категории</h3>
            {categories.length === 0 ? (
              <p className="empty-text">Категории еще не добавлены.</p>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>ID</th>
                      <th>Название</th>
                      <th style={{ width: '220px', textAlign: 'right' }}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => (
                      <tr key={cat.id} className={editingCategory?.id === cat.id ? 'row-active' : ''}>
                        <td>#{cat.id}</td>
                        <td className="font-semibold">{cat.name}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleStartEditCategory(cat)}
                            className="btn btn-sm btn-edit"
                          >
                            Редактировать
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="btn btn-sm btn-delete"
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= ВКЛАДКА БЛЮД ================= */
        <div className="admin-section">
          <div className="admin-card form-card">
            <h3>{editingDish ? 'Редактировать блюдо' : 'Добавить новое блюдо'}</h3>
            <form onSubmit={handleSaveDish} className="admin-dish-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="dish-name">Название блюда *</label>
                  <input
                    id="dish-name"
                    type="text"
                    placeholder="Например: Паста Карбонара"
                    value={dishName}
                    onChange={(e) => setDishName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="dish-price">Цена (руб.) *</label>
                  <input
                    id="dish-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Например: 450"
                    value={dishPrice}
                    onChange={(e) => setDishPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="dish-category">Категория *</label>
                  <select
                    id="dish-category"
                    value={dishCategoryId}
                    onChange={(e) => setDishCategoryId(e.target.value)}
                    required
                  >
                    <option value="">-- Выберите категорию --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="dish-photo">
                    Фото блюда {editingDish ? '(оставьте пустым, чтобы не менять)' : ''}
                  </label>
                  <input
                    id="dish-photo"
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={(e) => setDishPhoto(e.target.files[0] || null)}
                  />
                </div>
              </div>

              <div className="form-buttons" style={{ marginTop: '16px' }}>
                <button type="submit" className="btn btn-primary">
                  {editingDish ? 'Сохранить изменения' : 'Добавить блюдо'}
                </button>
                {editingDish && (
                  <button
                    type="button"
                    onClick={handleCancelEditDish}
                    className="btn btn-secondary"
                  >
                    Отмена
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="admin-card table-card">
            <h3>Список блюд</h3>
            {dishes.length === 0 ? (
              <p className="empty-text">Блюда еще не добавлены.</p>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Фото</th>
                      <th>Название</th>
                      <th>Категория</th>
                      <th>Цена</th>
                      <th style={{ width: '220px', textAlign: 'right' }}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dishes.map((dish) => {
                      const photoUrl = getPhotoUrl(dish.photo);
                      return (
                        <tr key={dish.id} className={editingDish?.id === dish.id ? 'row-active' : ''}>
                          <td>
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={dish.name}
                                className="table-photo"
                              />
                            ) : (
                              <div className="table-photo-placeholder">
                                <span>—</span>
                              </div>
                            )}
                          </td>
                          <td className="font-semibold">{dish.name}</td>
                          <td>
                            <span className="table-badge">
                              {dish.category_name || 'Без категории'}
                            </span>
                          </td>
                          <td className="font-bold text-price">
                            {Number(dish.price).toLocaleString('ru-RU')} ₽
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleStartEditDish(dish)}
                              className="btn btn-sm btn-edit"
                            >
                              Редактировать
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDish(dish.id)}
                              className="btn btn-sm btn-delete"
                            >
                              Удалить
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
