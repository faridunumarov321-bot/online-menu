require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./db');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Настройка хранилища для загружаемых фото в backend/uploads/
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({ storage });

// Middleware аутентификации по Bearer токену
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Токен отсутствует или имеет неверный формат' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Невалидный или истекший токен' });
  }
};

// Маршрут логина
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign(
      { username: process.env.ADMIN_USERNAME },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    return res.json({ token });
  }

  return res.status(401).json({ error: 'Неверный логин или пароль' });
});

// ===================== КАТЕГОРИИ =====================

// GET /api/categories — список всех категорий
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories').all();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categories — создать категорию (защищено authMiddleware)
app.post('/api/categories', authMiddleware, (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Поле name обязательно' });
    }

    const stmt = db.prepare('INSERT INTO categories (name) VALUES (?)');
    const result = stmt.run(name.trim());
    const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newCategory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categories/:id — обновить категорию (защищено authMiddleware)
app.put('/api/categories/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Поле name обязательно' });
    }

    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name.trim(), id);
    const updatedCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.json(updatedCategory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categories/:id — удалить категорию (защищено authMiddleware)
app.delete('/api/categories/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ message: 'Категория успешно удалена' });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(400).json({ error: 'Нельзя удалить категорию, к которой привязаны блюда' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ===================== БЛЮДА =====================

// GET /api/dishes?category=&search=&minPrice=&maxPrice= — список блюд с фильтрами
app.get('/api/dishes', (req, res) => {
  try {
    const { category, search, minPrice, maxPrice } = req.query;
    const conditions = [];
    const params = [];

    if (category !== undefined && category !== '') {
      conditions.push('dishes.category_id = ?');
      params.push(Number(category));
    }

    if (search !== undefined && search.trim() !== '') {
      conditions.push('dishes.name LIKE ?');
      params.push(`%${search.trim()}%`);
    }

    if (minPrice !== undefined && minPrice !== '') {
      conditions.push('dishes.price >= ?');
      params.push(Number(minPrice));
    }

    if (maxPrice !== undefined && maxPrice !== '') {
      conditions.push('dishes.price <= ?');
      params.push(Number(maxPrice));
    }

    let sql = 'SELECT dishes.*, categories.name AS category_name FROM dishes LEFT JOIN categories ON dishes.category_id = categories.id';
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const dishes = db.prepare(sql).all(...params);
    res.json(dishes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dishes — создать блюдо (защищено authMiddleware, multipart/form-data)
app.post('/api/dishes', authMiddleware, upload.single('photo'), (req, res) => {
  try {
    const { name, price, category_id } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({ error: 'Поле name обязательно' });
    }

    if (!category_id || isNaN(Number(category_id))) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({ error: 'Поле category_id обязательно' });
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({ error: 'Цена должна быть положительным числом' });
    }

    const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(Number(category_id));
    if (!category) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({ error: 'Указанная категория не существует' });
    }

    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

    const stmt = db.prepare(`
      INSERT INTO dishes (name, price, photo, category_id)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(name.trim(), parsedPrice, photoPath, Number(category_id));

    const newDish = db.prepare(`
      SELECT dishes.*, categories.name AS category_name
      FROM dishes
      LEFT JOIN categories ON dishes.category_id = categories.id
      WHERE dishes.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newDish);
  } catch (err) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) {}
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dishes/:id — обновить блюдо (защищено authMiddleware, multipart/form-data)
app.put('/api/dishes/:id', authMiddleware, upload.single('photo'), (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM dishes WHERE id = ?').get(id);
    if (!existing) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(404).json({ error: 'Блюдо не найдено' });
    }

    const { name, price, category_id } = req.body;

    let updatedName = existing.name;
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(400).json({ error: 'Поле name не может быть пустым' });
      }
      updatedName = name.trim();
    }

    let updatedPrice = existing.price;
    if (price !== undefined && price !== '') {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(400).json({ error: 'Цена должна быть положительным числом' });
      }
      updatedPrice = parsedPrice;
    }

    let updatedCategoryId = existing.category_id;
    if (category_id !== undefined && category_id !== '') {
      const parsedCatId = Number(category_id);
      if (isNaN(parsedCatId)) {
        if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(400).json({ error: 'Поле category_id некорректно' });
      }
      const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(parsedCatId);
      if (!category) {
        if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(400).json({ error: 'Указанная категория не существует' });
      }
      updatedCategoryId = parsedCatId;
    }

    let updatedPhoto = existing.photo;
    if (req.file) {
      updatedPhoto = `/uploads/${req.file.filename}`;
    }

    db.prepare(`
      UPDATE dishes
      SET name = ?, price = ?, photo = ?, category_id = ?
      WHERE id = ?
    `).run(updatedName, updatedPrice, updatedPhoto, updatedCategoryId, id);

    const updatedDish = db.prepare(`
      SELECT dishes.*, categories.name AS category_name
      FROM dishes
      LEFT JOIN categories ON dishes.category_id = categories.id
      WHERE dishes.id = ?
    `).get(id);

    res.json(updatedDish);
  } catch (err) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) {}
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/dishes/:id — удалить блюдо (защищено authMiddleware)
app.delete('/api/dishes/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM dishes WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Блюдо не найдено' });
    }

    db.prepare('DELETE FROM dishes WHERE id = ?').run(id);
    res.json({ message: 'Блюдо успешно удалено' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, authMiddleware };

