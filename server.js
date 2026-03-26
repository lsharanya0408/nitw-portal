// server.js — NITW Smart Campus Portal Backend
// Run: node server.js

const express = require("express");
const cors    = require("cors");
const mysql   = require("mysql2");
const path    = require("path");

const app = express();
app.use(express.json());
app.use(cors());

// ── Serve frontend files from same folder ──
app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ── MySQL connection ──
const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT
});

db.connect(err => {
  if (err) {
    console.error("❌ DB ERROR:", err);
  } else {
    console.log("✅ DB CONNECTED");
  }
});

db.connect(err => {
  if (err) {
  console.error("❌ MySQL Connection Failed:", err.message);
  console.log("Continuing without crashing...");
  return;
}
  console.log("✅ MySQL Connected to nitw_portal");
  createTables();
});

// ── Auto-create tables ──
function createTables() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(100) UNIQUE,
      password VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS logins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(100),
      login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS attendance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(100),
      attended INT,
      total INT,
      saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS gpa (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(100),
      cgpa FLOAT,
      saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  queries.forEach(q => db.query(q, err => {
    if (err) console.error("Table error:", err.message);
  }));
  console.log("✅ Tables ready");
}

// ── REGISTER ──
app.post("/register", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.send("Missing fields");
  if (!email.endsWith("@nitw.ac.in") && !email.endsWith("@student.nitw.ac.in")) {
    return res.send("Only NITW email allowed");
  }
  if (password.length < 4) return res.send("Password too short");

  db.query(
    "INSERT INTO users (email, password) VALUES (?, ?)",
    [email, password],
    err => {
      if (err && err.code === "ER_DUP_ENTRY") return res.send("User exists");
      if (err) return res.send("Error");
      console.log(`📝 Registered: ${email}`);
      res.send("Registered");
    }
  );
});

// ── LOGIN ──
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.send("Missing fields");

  db.query(
    "SELECT * FROM users WHERE email=? AND password=?",
    [email, password],
    (err, results) => {
      if (err) return res.send("Error");
      if (results.length > 0) {
        db.query("INSERT INTO logins (email) VALUES (?)", [email]);
        console.log(`✅ Login: ${email} at ${new Date().toLocaleString("en-IN")}`);
        res.send("Success");
      } else {
        res.send("Invalid");
      }
    }
  );
});

// ── SAVE ATTENDANCE ──
app.post("/attendance", (req, res) => {
  const { email, attended, total } = req.body;
  db.query(
    "INSERT INTO attendance (email, attended, total) VALUES (?, ?, ?)",
    [email, attended, total],
    err => { if (err) console.error(err.message); }
  );
  res.send("Saved");
});

// ── SAVE GPA ──
app.post("/gpa", (req, res) => {
  const { email, cgpa } = req.body;
  db.query(
    "INSERT INTO gpa (email, cgpa) VALUES (?, ?)",
    [email, cgpa],
    err => { if (err) console.error(err.message); }
  );
  res.send("Saved");
});

// ── VIEW LOGINS (teacher dashboard) ──
app.get("/admin/logins", (req, res) => {
  db.query("SELECT email, login_time FROM logins ORDER BY login_time DESC LIMIT 50", (err, rows) => {
    if (err) return res.json({ error: err.message });
    res.json(rows);
  });
});

// ── START ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});