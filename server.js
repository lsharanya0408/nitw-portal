// server.js — NITW Smart Campus Portal
// Works on Railway (cloud) AND localhost

const express = require("express");
const cors    = require("cors");
const mysql   = require("mysql2");
const path    = require("path");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ── DB config: Railway env vars OR local fallback ──
const dbConfig = {
  host:     process.env.MYSQLHOST     || "localhost",
  user:     process.env.MYSQLUSER     || "root",
  password: process.env.MYSQLPASSWORD || "your_local_password",
  database: process.env.MYSQLDATABASE || "nitw_portal",
  port:     parseInt(process.env.MYSQLPORT) || 3306,
  ssl: process.env.MYSQLHOST ? { rejectUnauthorized: false } : false,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 20000
};

console.log("Connecting to DB host:", dbConfig.host);

// Use pool instead of single connection (more reliable on Railway)
const pool = mysql.createPool(dbConfig);
const db   = pool.promise();

// ── Auto-create tables ──
async function createTables() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(100) UNIQUE,
      password VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS logins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(100),
      login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS attendance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(100),
      attended INT,
      total INT,
      saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS gpa (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(100),
      cgpa FLOAT,
      saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log("✅ All tables ready");
  } catch (err) {
    console.error("❌ Table creation error:", err.message);
  }
}

createTables();

// ── REGISTER ──
app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)   return res.send("Missing fields");
    if (!email.endsWith("@nitw.ac.in") && !email.endsWith("@student.nitw.ac.in"))
      return res.send("Only NITW email allowed");
    if (password.length < 4)   return res.send("Password too short");

    await db.query(
      "INSERT INTO users (email, password) VALUES (?, ?)",
      [email, password]
    );
    console.log("📝 Registered:", email);
    res.send("Registered");
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.send("User exists");
    console.error("Register error:", err.message);
    res.send("Error: " + err.message);
  }
});

// ── LOGIN ──
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.send("Missing fields");

    const [rows] = await db.query(
      "SELECT * FROM users WHERE email=? AND password=?",
      [email, password]
    );
    if (rows.length > 0) {
      await db.query("INSERT INTO logins (email) VALUES (?)", [email]);
      console.log("✅ Login:", email);
      res.send("Success");
    } else {
      res.send("Invalid");
    }
  } catch (err) {
    console.error("Login error:", err.message);
    res.send("Error: " + err.message);
  }
});

// ── SAVE ATTENDANCE ──
app.post("/attendance", async (req, res) => {
  try {
    const { email, attended, total } = req.body;
    await db.query(
      "INSERT INTO attendance (email, attended, total) VALUES (?, ?, ?)",
      [email, attended, total]
    );
    res.send("Saved");
  } catch (err) {
    console.error("Attendance error:", err.message);
    res.send("Error");
  }
});

// ── SAVE GPA ──
app.post("/gpa", async (req, res) => {
  try {
    const { email, cgpa } = req.body;
    await db.query(
      "INSERT INTO gpa (email, cgpa) VALUES (?, ?)",
      [email, cgpa]
    );
    res.send("Saved");
  } catch (err) {
    console.error("GPA error:", err.message);
    res.send("Error");
  }
});

// ── ADMIN: All logins ──
app.get("/admin/logins", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT email, login_time FROM logins ORDER BY login_time DESC LIMIT 100"
    );
    res.json(rows);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ── ADMIN: All users ──
app.get("/admin/users", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT email, created_at FROM users ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ── Health check ──
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 NITW Portal running on port ${PORT}`);
  console.log(`   Local: http://localhost:${PORT}`);
});
