import { useState } from 'react';

function DishCard({ dish }) {
  const [imageError, setImageError] = useState(false);

  // Формирование корректного URL к фото
  const getPhotoUrl = (photo) => {
    if (!photo) return null;
    if (photo.startsWith('http://') || photo.startsWith('https://')) {
      return photo;
    }
    const cleanPath = photo.startsWith('/') ? photo : `/${photo}`;
    return `http://localhost:5000${cleanPath}`;
  };

  const photoUrl = getPhotoUrl(dish.photo);
  const showImage = photoUrl && !imageError;

  return (
    <div className="dish-card">
      <div className="dish-image-wrapper">
        {showImage ? (
          <img
            src={photoUrl}
            alt={dish.name}
            className="dish-image"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="dish-placeholder">
            <svg
              className="dish-placeholder-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
            <span>Нет фото</span>
          </div>
        )}
      </div>

      <div className="dish-info">
        {dish.category_name && (
          <span className="dish-category">{dish.category_name}</span>
        )}
        <h3 className="dish-name">{dish.name}</h3>
        <div className="dish-footer">
          <span className="dish-price">{Number(dish.price).toLocaleString('ru-RU')} ₽</span>
        </div>
      </div>
    </div>
  );
}

export default DishCard;
