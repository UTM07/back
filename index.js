require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Función de prueba de conexión
async function testConnection() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("🟢 Conectado correctamente a la base de datos:", res.rows[0].now);
  } catch (err) {
    console.error("🔴 Error al conectar con la base de datos:", err.message);
  }
}


// Rutas CRUD
app.get("/tasks", async (req, res) => {
  const result = await pool.query("SELECT * FROM tasks ORDER BY id DESC");
  res.json(result.rows);
});

app.post("/tasks", async (req, res) => {
  const { title, description } = req.body;
  const result = await pool.query(
    "INSERT INTO tasks (title, description) VALUES ($1, $2) RETURNING *",
    [title, description]
  );
  res.json(result.rows[0]);
});

app.put("/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description, completed } = req.body;
  const result = await pool.query(
    "UPDATE tasks SET title=$1, description=$2, completed=$3 WHERE id=$4 RETURNING *",
    [title, description, completed, id]
  );
  res.json(result.rows[0]);
});

app.delete("/tasks/:id", async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM tasks WHERE id=$1", [id]);
  res.sendStatus(204);
});


testConnection();


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// 🔐 REGISTRO
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, hashedPassword]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: "El correo ya está registrado." });
    }
    res.status(500).json({ error: "Error al registrar usuario." });
  }
});

// 🔐 LOGIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Correo o contraseña incorrectos." });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(400).json({ error: "Correo o contraseña incorrectos." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET || "secret_key", // Usa una clave más segura en producción
      { expiresIn: "1h" }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: "Error al iniciar sesión." });
  }
});


app.get("/fix-columns", async (req, res) => {
  try {
    await pool.query(`
      ALTER TABLE users
        ALTER COLUMN name TYPE TEXT,
        ALTER COLUMN email TYPE TEXT,
        ALTER COLUMN password TYPE TEXT;
    `);
    res.send("✅ Columnas actualizadas a TEXT correctamente.");
  } catch (err) {
    console.error("Error al actualizar columnas:", err.message);
    res.status(500).send("❌ Error al modificar columnas.");
  }
});
