// =========================================================================
// MoodWall — Client Application Script
// Hybrid Architecture: รองรับทั้ง Custom Backend Server (Node.js/WS) 
// และ GitHub Pages Standalone Mode (LocalStorage DB) ทำงานได้ 100% ทุกที่
// =========================================================================

const isGitHubPages = window.location.hostname.includes("github.io");

function getApiBase() {
  if (
    !window.location.origin ||
    window.location.origin === "null" ||
    window.location.protocol === "file:" ||
    isGitHubPages
  ) {
    return "http://localhost:3000";
  }
  if (
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
    window.location.port &&
    window.location.port !== "3000"
  ) {
    return "http://localhost:3000";
  }
  return window.location.origin;
}

function getWebSocketUrl() {
  if (
    !window.location.origin ||
    window.location.origin === "null" ||
    window.location.protocol === "file:" ||
    isGitHubPages
  ) {
    return "ws://localhost:3000";
  }
  if (
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
    window.location.port &&
    window.location.port !== "3000"
  ) {
    return "ws://localhost:3000";
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}`;
}

const API_BASE = getApiBase();

// Default Dataset สำหรับ GitHub Pages และ Standalone Demo
const DEFAULT_POSTS = [
  {
    id: "post-1",
    content: "ยินดีต้อนรับสู่ MoodWall! พื้นที่ปลอดภัยสำหรับระบายความรู้สึกและอารมณ์ของคุณ ไม่ระบุตัวตน ✨",
    mood: "fire",
    likes: 28,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: "post-2",
    content: "ปั่นโปรเจกต์จนดึก แต่ทำระบบสำเร็จแล้ว รู้สึกโล่งใจมาก สู้ๆ นะทุกคน 💻🚀",
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

function getLocalDb() {
  const stored = localStorage.getItem("moodwall_db_posts");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.error("Local DB parse error:", e);
    }
  }
  saveLocalDb(DEFAULT_POSTS);
  return DEFAULT_POSTS;
}

function saveLocalDb(data) {
  localStorage.setItem("moodwall_db_posts", JSON.stringify(data));
}

let postsData = [];
let currentFilter = "all";
const likedPosts = new Set(JSON.parse(localStorage.getItem("moodwall_liked") || "[]"));

// Mood Definitions
const MOOD_MAP = {
  happy:    { label: "มีความสุข", emoji: "😊", class: "happy" },
  stressed: { label: "เครียด/งานเยอะ", emoji: "🤯", class: "stressed" },
  sleepy:   { label: "ง่วงนอน/เพลีย", emoji: "😴", class: "sleepy" },
  fire:     { label: "มีไฟ/สู้ตาย", emoji: "🔥", class: "fire" },
  sad:      { label: "ต้องการกำลังใจ", emoji: "😭", class: "sad" },
};

// DOM Elements
const postsGrid = document.getElementById("postsGrid");
const loadingIndicator = document.getElementById("loadingIndicator");
const emptyState = document.getElementById("emptyState");
const realtimeStatus = document.getElementById("realtimeStatus");

const modalBackdrop = document.getElementById("modalBackdrop");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelBtn = document.getElementById("cancelBtn");
const confessionForm = document.getElementById("confessionForm");
const confessionText = document.getElementById("confessionText");
const charCounter = document.querySelector(".char-counter");
const modalMoodSelector = document.getElementById("modalMoodSelector");
const moodFilters = document.getElementById("moodFilters");
const toast = document.getElementById("toast");

// =========================================================================
// 1. โหลดข้อมูลโพสต์ (Hybrid: REST API หรือ Local DB Fallback)
// =========================================================================
async function fetchPosts() {
  if (loadingIndicator) loadingIndicator.classList.remove("hidden");
  if (postsGrid) postsGrid.innerHTML = "";
  if (emptyState) emptyState.classList.add("hidden");

  let loadedFromBackend = false;

  if (!isGitHubPages && window.location.protocol !== "file:") {
    try {
      const res = await fetch(`${API_BASE}/api/posts`);
      if (res.ok) {
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          postsData = result.data;
          loadedFromBackend = true;
        }
      }
    } catch (err) {
      console.warn("Backend not available, using local store:", err.message);
    }
  }

  if (!loadedFromBackend) {
    postsData = getLocalDb();
  }

  if (loadingIndicator) loadingIndicator.classList.add("hidden");
  renderPosts();
}

// =========================================================================
// 2. การแสดงผลการ์ดโพสต์บนหน้าจอ
// =========================================================================
function renderPosts() {
  if (!postsGrid) return;
  postsGrid.innerHTML = "";

  const filteredPosts = postsData.filter((post) => {
    if (currentFilter === "all") return true;
    return post.mood === currentFilter;
  });

  if (filteredPosts.length === 0) {
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");

  filteredPosts.forEach((post) => {
    const card = document.createElement("article");
    card.className = "post-card";
    card.id = `post-${post.id}`;

    const moodInfo = MOOD_MAP[post.mood] || MOOD_MAP.happy;
    const timeText = formatTimeAgo(post.created_at);
    const isLiked = likedPosts.has(post.id);

    card.innerHTML = `
      <div class="post-header">
        <span class="mood-badge ${moodInfo.class}">
          <span>${moodInfo.emoji}</span>
          <span>${moodInfo.label}</span>
        </span>
        <span class="time-ago">${timeText}</span>
      </div>
      <div class="post-content">${escapeHTML(post.content)}</div>
      <div class="post-footer">
        <span style="font-size: 12px; color: var(--text-dim);">#ไม่ระบุตัวตน</span>
        <button class="like-btn ${isLiked ? 'liked' : ''}" data-id="${post.id}" data-likes="${post.likes || 0}">
          <span>${isLiked ? '❤️' : '🤍'}</span>
          <span class="like-count">${post.likes || 0}</span>
        </button>
      </div>
    `;

    const likeBtn = card.querySelector(".like-btn");
    if (likeBtn) {
      likeBtn.addEventListener("click", () => handleLike(post.id, post.likes || 0, likeBtn));
    }

    postsGrid.appendChild(card);
  });
}

// =========================================================================
// 3. ฟังก์ชันกดหัวใจ (Likes)
// =========================================================================
async function handleLike(postId, currentLikes, buttonEl) {
  if (likedPosts.has(postId)) {
    showToast("💖 คุณกดหัวใจให้ข้อความนี้ไปแล้วครับ!");
    buttonEl.classList.add("bump");
    setTimeout(() => buttonEl.classList.remove("bump"), 350);
    return;
  }

  const newLikes = currentLikes + 1;
  likedPosts.add(postId);
  localStorage.setItem("moodwall_liked", JSON.stringify([...likedPosts]));

  buttonEl.classList.add("liked", "bump");
  buttonEl.querySelector("span:first-child").textContent = "❤️";
  buttonEl.querySelector(".like-count").textContent = newLikes;
  setTimeout(() => buttonEl.classList.remove("bump"), 350);

  const index = postsData.findIndex((p) => p.id === postId);
  if (index !== -1) {
    postsData[index].likes = newLikes;
    saveLocalDb(postsData);
  }

  if (!isGitHubPages && window.location.protocol !== "file:") {
    try {
      await fetch(`${API_BASE}/api/posts/${postId}/like`, { method: "POST" });
    } catch (err) {
      console.warn("Backend like sync bypassed:", err.message);
    }
  }

  showToast("❤️ ส่งกำลังใจสำเร็จ!");
}

// =========================================================================
// 4. ระบบ WebSocket Realtime
// =========================================================================
let socket = null;

function connectRealtime() {
  if (isGitHubPages) {
    if (realtimeStatus) {
      realtimeStatus.innerHTML = `
        <span class="status-dot" style="background:#38bdf8;box-shadow:0 0 10px #38bdf8;"></span>
        <span class="status-text" style="color:#38bdf8;">GitHub Pages Live</span>
      `;
    }
    return;
  }

  if (window.location.protocol === "file:") {
    if (realtimeStatus) {
      realtimeStatus.innerHTML = `
        <span class="status-dot" style="background:#fbbf24;box-shadow:0 0 10px #fbbf24;"></span>
        <span class="status-text" style="color:#fbbf24;">Local File Mode</span>
      `;
    }
    return;
  }

  const wsUrl = getWebSocketUrl();

  try {
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("🟢 Connected to Custom Realtime Server via " + wsUrl);
      if (realtimeStatus) {
        realtimeStatus.innerHTML = `
          <span class="status-dot"></span>
          <span class="status-text">Realtime Live</span>
        `;
      }
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { event: eventType, payload } = msg;

        if (eventType === "INSERT") {
          if (!postsData.some((p) => p.id === payload.id)) {
            postsData.unshift(payload);
            saveLocalDb(postsData);
            renderPosts();
            showToast("✨ มีข้อความระบายอารมณ์โพสต์ใหม่แบบ Realtime!");
          }
        } else if (eventType === "UPDATE") {
          const idx = postsData.findIndex((p) => p.id === payload.id);
          if (idx !== -1) {
            postsData[idx] = { ...postsData[idx], ...payload };
            saveLocalDb(postsData);
            renderPosts();
          }
        } else if (eventType === "DELETE") {
          postsData = postsData.filter((p) => p.id !== payload.id);
          saveLocalDb(postsData);
          renderPosts();
          showToast("🗑️ มีโพสต์ถูกลบออกจากระบบโดยผู้ดูแล");
        } else if (eventType === "RESET") {
          postsData = payload || [];
          saveLocalDb(postsData);
          renderPosts();
          showToast("🔄 ข้อมูลระบบถูกรีเซ็ตโดยผู้ดูแล");
        }
      } catch (e) {
        console.error("Error processing websocket message:", e);
      }
    };

    socket.onclose = () => {
      if (realtimeStatus) {
        realtimeStatus.innerHTML = `
          <span class="status-dot" style="background:#fbbf24;box-shadow:0 0 10px #fbbf24;"></span>
          <span class="status-text" style="color:#fbbf24;">กำลังเชื่อมต่อใหม่...</span>
        `;
      }
      setTimeout(connectRealtime, 4000);
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
      if (socket) socket.close();
    };
  } catch (err) {
    console.error("WebSocket connection error:", err);
  }
}

// =========================================================================
// 5. ตัวกรองอารมณ์ (Mood Filters)
// =========================================================================
if (moodFilters) {
  moodFilters.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;

    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.getAttribute("data-mood");
    renderPosts();
  });
}

// =========================================================================
// 6. ระบบ Modal และฟอร์มโพสต์ข้อความใหม่
// =========================================================================
function openModal() {
  if (modalBackdrop) {
    modalBackdrop.classList.remove("hidden");
    setTimeout(() => {
      if (confessionText) confessionText.focus();
    }, 50);
  }
}

function closeModal() {
  if (modalBackdrop) modalBackdrop.classList.add("hidden");
  if (confessionForm) confessionForm.reset();
  
  document.querySelectorAll(".mood-option").forEach((el) => el.classList.remove("selected"));
  const defaultOption = document.querySelector('.mood-option input[value="happy"]')?.closest(".mood-option");
  if (defaultOption) defaultOption.classList.add("selected");

  updateCharCounter();
}

document.querySelectorAll('[data-open-modal="true"]').forEach((btn) => {
  btn.addEventListener("click", openModal);
});

if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

if (modalBackdrop) {
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalBackdrop && !modalBackdrop.classList.contains("hidden")) {
    closeModal();
  }
});

if (modalMoodSelector) {
  modalMoodSelector.addEventListener("click", (e) => {
    const label = e.target.closest(".mood-option");
    if (!label) return;

    document.querySelectorAll(".mood-option").forEach((el) => el.classList.remove("selected"));
    label.classList.add("selected");
    const radio = label.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  });
}

if (confessionText) {
  confessionText.addEventListener("input", updateCharCounter);

  confessionText.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (confessionForm) confessionForm.requestSubmit();
    }
  });
}

function updateCharCounter() {
  if (!confessionText || !charCounter) return;
  const count = confessionText.value.length;
  charCounter.textContent = `${count} / 280 ตัวอักษร`;
  charCounter.style.color = count > 250 ? "#f87171" : "var(--text-dim)";
}

if (confessionForm) {
  confessionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = confessionText ? confessionText.value.trim() : "";
    if (!text) {
      showToast("⚠️ กรุณากรอกข้อความก่อนโพสต์");
      if (confessionText) confessionText.focus();
      return;
    }

    const selectedMoodEl = document.querySelector('input[name="mood"]:checked');
    const mood = selectedMoodEl ? selectedMoodEl.value : "happy";

    const submitBtn = document.getElementById("submitPostBtn");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>⏳ กำลังส่ง...</span>`;
    }

    const newPost = {
      id: "post-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      content: text,
      mood: mood,
      likes: 0,
      created_at: new Date().toISOString()
    };

    let savedOnBackend = false;

    if (!isGitHubPages && window.location.protocol !== "file:") {
      try {
        const res = await fetch(`${API_BASE}/api/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text, mood: mood })
        });

        const result = await res.json();
        if (res.ok && result.success && result.data) {
          if (!postsData.some((p) => p.id === result.data.id)) {
            postsData.unshift(result.data);
            saveLocalDb(postsData);
            renderPosts();
          }
          savedOnBackend = true;
        }
      } catch (err) {
        console.warn("Backend post bypassed:", err.message);
      }
    }

    if (!savedOnBackend) {
      // บันทึกลง LocalStorage DB
      postsData.unshift(newPost);
      saveLocalDb(postsData);
      renderPosts();
    }

    closeModal();
    showToast("✨ โพสต์ระบายความรู้สึกสำเร็จแล้ว!");

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>🚀 ส่งข้อความ (Live!)</span>`;
    }
  });
}

// =========================================================================
// 7. Helper Functions
// =========================================================================
function formatTimeAgo(isoDateString) {
  if (!isoDateString) return "เมื่อกี้";
  const now = new Date();
  const date = new Date(isoDateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 30) return "เมื่อกี้";
  if (diffInSeconds < 60) return `${diffInSeconds} วิที่แล้ว`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} นาทีที่แล้ว`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} ชม. ที่แล้ว`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} วันที่แล้ว`;
}

function escapeHTML(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message) {
  const toastMessage = document.getElementById("toastMessage");
  if (!toastMessage || !toast) return;
  toastMessage.textContent = message;
  toast.classList.remove("hidden");

  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3500);
}

// =========================================================================
// 8. เริ่มต้นทำงาน
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
  fetchPosts();
  connectRealtime();
});
