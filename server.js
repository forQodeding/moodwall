const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer, WebSocket } = require("ws");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "posts.json");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Ensure data directory and database file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_POSTS = [
  {
    id: "post-1",
    content: "ยินดีต้อนรับสู่ MoodWall! ระบบนี้ใช้ Custom Backend + Database ที่เราสร้างขึ้นเอง มีระบบหลังบ้านจัดการข้อมูลได้แบบ Realtime ✨",
    mood: "fire",
    likes: 28,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: "post-2",
    content: "ปั่นโปรเจกต์งานกลุ่มจนดึก แต่ทำระบบหลังบ้านสำเร็จแล้ว รู้สึกโล่งใจมาก สู้ๆ นะทุกคน 💻🚀",
    mood: "happy",
    likes: 19,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: "post-3",
    content: "ง่วงนอนมาก วันนี้นอนไป 3 ชั่วโมง ต้องดื่มกาแฟแก้วที่สองแล้ว 😴💤",
    mood: "sleepy",
    likes: 14,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "post-4",
    content: "สัปดาห์นี้งานเยอะและสอบติดกันหลายวิชา เครียดนิดหน่อย แต่จะผ่านมันไปให้ได้ 😭💪",
    mood: "stressed",
    likes: 35,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  }
];

function readDatabase() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      writeDatabase(DEFAULT_POSTS);
      return DEFAULT_POSTS;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading database:", err);
    return [];
  }
}

function writeDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database:", err);
  }
}

// Broadcast event to all connected WebSocket clients
function broadcast(event, payload) {
  const message = JSON.stringify({ event, payload });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// WebSocket Connection handling
wss.on("connection", (ws) => {
  console.log("⚡ Client connected to Realtime WebSocket");
  ws.send(JSON.stringify({ event: "CONNECTED", payload: { message: "Connected to Custom Realtime Server" } }));

  ws.on("close", () => {
    console.log("🔌 Client disconnected");
  });
});

// ==========================================
// REST API Routes
// ==========================================

// 1. GET all posts
app.get("/api/posts", (req, res) => {
  const posts = readDatabase();
  // Sort newest first
  posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ success: true, data: posts });
});

// 2. POST create new post
app.post("/api/posts", (req, res) => {
  const { content, mood } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, error: "Content is required" });
  }

  const posts = readDatabase();
  const newPost = {
    id: "post-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    content: content.trim(),
    mood: mood || "happy",
    likes: 0,
    created_at: new Date().toISOString()
  };

  posts.unshift(newPost);
  writeDatabase(posts);

  // Broadcast Realtime INSERT to all clients
  broadcast("INSERT", newPost);

  res.status(201).json({ success: true, data: newPost });
});

// 3. PUT update post (Admin Edit / Content Edit)
app.put("/api/posts/:id", (req, res) => {
  const { id } = req.params;
  const { content, mood, likes } = req.body;

  const posts = readDatabase();
  const index = posts.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: "Post not found" });
  }

  if (content !== undefined) posts[index].content = content.trim();
  if (mood !== undefined) posts[index].mood = mood;
  if (likes !== undefined) posts[index].likes = parseInt(likes, 10) || 0;
  posts[index].updated_at = new Date().toISOString();

  writeDatabase(posts);

  // Broadcast Realtime UPDATE to all clients
  broadcast("UPDATE", posts[index]);

  res.json({ success: true, data: posts[index] });
});

// 4. POST like a post
app.post("/api/posts/:id/like", (req, res) => {
  const { id } = req.params;
  const posts = readDatabase();
  const index = posts.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: "Post not found" });
  }

  posts[index].likes = (posts[index].likes || 0) + 1;
  writeDatabase(posts);

  // Broadcast Realtime UPDATE to all clients
  broadcast("UPDATE", posts[index]);

  res.json({ success: true, data: posts[index] });
});

// 5. DELETE post (Admin Delete)
app.delete("/api/posts/:id", (req, res) => {
  const { id } = req.params;
  let posts = readDatabase();
  const exists = posts.some((p) => p.id === id);

  if (!exists) {
    return res.status(404).json({ success: false, error: "Post not found" });
  }

  posts = posts.filter((p) => p.id !== id);
  writeDatabase(posts);

  // Broadcast Realtime DELETE to all clients
  broadcast("DELETE", { id });

  res.json({ success: true, message: "Post deleted successfully", id });
});

// 6. GET statistics
app.get("/api/stats", (req, res) => {
  const posts = readDatabase();
  const totalPosts = posts.length;
  const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);

  const moodCounts = { happy: 0, stressed: 0, sleepy: 0, fire: 0, sad: 0 };
  posts.forEach((p) => {
    if (moodCounts[p.mood] !== undefined) {
      moodCounts[p.mood]++;
    }
  });

  res.json({
    success: true,
    data: {
      totalPosts,
      totalLikes,
      moodCounts
    }
  });
});

// 7. POST Reset Database (Admin action)
app.post("/api/admin/reset", (req, res) => {
  writeDatabase(DEFAULT_POSTS);
  broadcast("RESET", DEFAULT_POSTS);
  res.json({ success: true, message: "Database reset to defaults", data: DEFAULT_POSTS });
});

// Start Server
server.listen(PORT, () => {
  console.log("==================================================");
  console.log("🚀 MoodWall Custom Backend & Realtime Server Running!");
  console.log(`📡 URL หน้าบ้าน:   http://localhost:${PORT}`);
  console.log(`🛡️ URL หลังบ้าน:   http://localhost:${PORT}/admin.html`);
  console.log(`🗄️ ไฟล์ฐานข้อมูล:   ${DB_FILE}`);
  console.log("==================================================");
});
