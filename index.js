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


