
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Benvindo199380@',
  database: process.env.DB_NAME || 'corte',
  port: process.env.DB_PORT || 3306
};

let pool;

// Função auxiliar para garantir que campos JSON sejam objetos
const parseJsonField = (field) => {
  if (!field) return [];
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch (e) {
      console.error("Erro ao parsear campo JSON:", e);
      return [];
    }
  }
  return field;
};

// Converte ISO Date (JS) para formato MySQL DATETIME (YYYY-MM-DD HH:MM:SS)
const toSqlDate = (isoString) => {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 19).replace('T', ' ');
  } catch (e) {
    return null;
  }
};

async function connectDB() {
  try {
    pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();
    console.log(`✅ Conectado ao banco de dados: ${dbConfig.database}`);
    connection.release();
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        code VARCHAR(255) NOT NULL,
        description TEXT,
        defaultFabric VARCHAR(255),
        defaultColors JSON,
        defaultGrid VARCHAR(50),
        estimatedPiecesPerRoll INT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS seamstresses (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        specialty VARCHAR(255),
        active BOOLEAN DEFAULT TRUE,
        address TEXT,
        city VARCHAR(255)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS fabrics (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        color VARCHAR(255),
        colorHex VARCHAR(50),
        stockRolls FLOAT DEFAULT 0,
        notes TEXT,
        createdAt DATETIME,
        updatedAt DATETIME
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        referenceId VARCHAR(255),
        referenceCode VARCHAR(255),
        description TEXT,
        fabric VARCHAR(255),
        items JSON,
        activeCuttingItems JSON,
        splits JSON,
        gridType VARCHAR(50),
        status VARCHAR(50),
        notes TEXT,
        createdAt DATETIME,
        updatedAt DATETIME,
        finishedAt DATETIME
      )
    `);

  } catch (error) {
    console.error('❌ Erro na conexão MySQL:', error.message);
    process.exit(1);
  }
}

connectDB();

// --- ROTAS PRODUTOS ---
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products');
    const processed = rows.map(r => ({
      ...r,
      defaultColors: parseJsonField(r.defaultColors)
    }));
    res.json(processed);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const p = req.body;
    const id = p.id || Date.now().toString();
    await pool.query(
      'INSERT INTO products (id, code, description, defaultFabric, defaultColors, defaultGrid, estimatedPiecesPerRoll) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, p.code, p.description, p.defaultFabric, JSON.stringify(p.defaultColors), p.defaultGrid, p.estimatedPiecesPerRoll]
    );
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    res.json({ ...rows[0], defaultColors: parseJsonField(rows[0].defaultColors) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const p = req.body;
    await pool.query(
      'UPDATE products SET code=?, description=?, defaultFabric=?, defaultColors=?, defaultGrid=?, estimatedPiecesPerRoll=? WHERE id=?',
      [p.code, p.description, p.defaultFabric, JSON.stringify(p.defaultColors), p.defaultGrid, p.estimatedPiecesPerRoll, id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- ROTAS ORDENS ---
app.get('/api/orders', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders ORDER BY createdAt DESC');
    const processed = rows.map(r => ({
      ...r,
      items: parseJsonField(r.items),
      activeCuttingItems: parseJsonField(r.activeCuttingItems),
      splits: parseJsonField(r.splits)
    }));
    res.json(processed);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const o = req.body;
    await pool.query(
      'INSERT INTO orders (id, referenceId, referenceCode, description, fabric, items, activeCuttingItems, splits, gridType, status, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [o.id, o.referenceId, o.referenceCode, o.description, o.fabric, JSON.stringify(o.items), JSON.stringify(o.activeCuttingItems), JSON.stringify(o.splits), o.gridType, o.status, o.notes, toSqlDate(o.createdAt), toSqlDate(o.updatedAt)]
    );
    res.json(o);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const queryParts = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      queryParts.push(`${key} = ?`);
      if (typeof value === 'object' && value !== null) {
        values.push(JSON.stringify(value));
      } else if (key === 'createdAt' || key === 'updatedAt' || key === 'finishedAt') {
        values.push(toSqlDate(value));
      } else {
        values.push(value);
      }
    }

    await pool.query(`UPDATE orders SET ${queryParts.join(', ')} WHERE id = ?`, [...values, id]);
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    const r = rows[0];
    res.json({
      ...r,
      items: parseJsonField(r.items),
      activeCuttingItems: parseJsonField(r.activeCuttingItems),
      splits: parseJsonField(r.splits)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Fix: Added missing DELETE route for orders
app.delete('/api/orders/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- TECIDOS ---
app.get('/api/fabrics', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM fabrics ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/fabrics', async (req, res) => {
  try {
    const f = req.body;
    const id = f.id || Date.now().toString();
    const createdAt = toSqlDate(f.createdAt) || toSqlDate(new Date().toISOString());
    const updatedAt = toSqlDate(f.updatedAt) || toSqlDate(new Date().toISOString());
    
    await pool.query(
      'INSERT INTO fabrics (id, name, color, colorHex, stockRolls, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, f.name, f.color, f.colorHex, f.stockRolls, f.notes, createdAt, updatedAt]
    );
    const [rows] = await pool.query('SELECT * FROM fabrics WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch('/api/fabrics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const queryParts = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id') continue;
      queryParts.push(`${key} = ?`);
      if (key === 'createdAt' || key === 'updatedAt') {
        values.push(toSqlDate(value));
      } else {
        values.push(value);
      }
    }

    if (queryParts.length > 0) {
      await pool.query(`UPDATE fabrics SET ${queryParts.join(', ')} WHERE id = ?`, [...values, id]);
    }
    
    const [rows] = await pool.query('SELECT * FROM fabrics WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/fabrics/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM fabrics WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- COSTUREIRAS ---
app.get('/api/seamstresses', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM seamstresses');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/seamstresses', async (req, res) => {
  try {
    const s = req.body;
    const id = s.id || Date.now().toString();
    await pool.query(
      'INSERT INTO seamstresses (id, name, phone, specialty, active, address, city) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, s.name, s.phone, s.specialty, s.active, s.address, s.city]
    );
    const [rows] = await pool.query('SELECT * FROM seamstresses WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/seamstresses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const s = req.body;
    await pool.query(
      'UPDATE seamstresses SET name=?, phone=?, specialty=?, active=?, address=?, city=? WHERE id=?',
      [s.name, s.phone, s.specialty, s.active, s.address, s.city, id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Kavin's rodando na porta ${PORT}`);
});
