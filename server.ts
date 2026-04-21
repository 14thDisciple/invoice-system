import express from "express";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import path from "path";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_development_only";

// Database Setup
const db = new Database("app.db");

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    docType TEXT NOT NULL,
    date TEXT NOT NULL,
    clientName TEXT,
    documentNumber TEXT NOT NULL,
    totalAmount REAL,
    data TEXT NOT NULL
  );
`);

// Seed default admin if no users exist
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  const hash = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run("admin", hash, "admin");
}

app.use(express.json({ limit: "50mb" }));

// --- Authentication Middleware ---
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.status(401).json({ error: "Missing token" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// --- API Routes ---
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Login
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
  
  if (user && bcrypt.compareSync(password, user.password_hash)) {
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, role: user.role, username: user.username });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Check auth status
app.get("/api/auth/me", authenticateToken, (req: any, res) => {
  res.json({ user: req.user });
});

// Create User (Admin Only)
app.post("/api/users", authenticateToken, requireAdmin, (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run(username, hash, role);
    res.json({ success: true });
  } catch (err: any) {
    if (err.message.includes("UNIQUE constraint")) {
      res.status(400).json({ error: "Username already exists" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.get("/api/users", authenticateToken, requireAdmin, (req, res) => {
  const users = db.prepare("SELECT id, username, role FROM users").all();
  res.json(users);
});

// Document History Routes
app.get("/api/documents", authenticateToken, (req, res) => {
  const docs = db.prepare("SELECT * FROM documents ORDER BY date DESC").all();
  const formattedDocs = docs.map((d: any) => ({
    ...d,
    data: JSON.parse(d.data)
  }));
  res.json(formattedDocs);
});

app.post("/api/documents", authenticateToken, (req, res) => {
  const { id, docType, date, clientName, documentNumber, totalAmount, data } = req.body;
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO documents (id, docType, date, clientName, documentNumber, totalAmount, data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, docType, date, clientName || '', documentNumber, totalAmount || 0, JSON.stringify(data));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


app.post("/api/send-email", authenticateToken, async (req, res) => {
  const { to, subject, body, pdfBase64, documentType } = req.body;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ error: "Missing RESEND_API_KEY environment variable. Please configure it in settings." });
  }

  const resend = new Resend(apiKey);

  try {
    const htmlBody = `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb; margin-top: 0;">${subject || "Your Document"}</h2>
        <p style="color: #334155; line-height: 1.6; white-space: pre-wrap;">${body || "Please find your document attached."}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">Sent securely via Coastal Tech Hub Document Deployment System</p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: "Coastal Tech Hub <onboarding@resend.dev>",
      to: [to],
      subject: subject || "Your Document from Coastal Tech Hub",
      html: htmlBody,
      attachments: [
        {
          content: pdfBase64,
          filename: `${documentType}_document.pdf`,
          contentType: "application/pdf",
        },
      ],
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
