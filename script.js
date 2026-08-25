// =========================================================================
// MoodWall — Client Application Script
// เชื่อมต่อ Custom Backend API & WebSocket Realtime (ไม่ใช้ Supabase)
// =========================================================================

// คำนวณ Base API URL ให้อัตโนมัติ (รองรับ localhost, Live Server, file:// และ Production)
function getApiBase() {
  if (
    !window.location.origin ||
    window.location.origin === "null" ||
    window.location.protocol === "file:"
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
    window.location.protocol === "file:"
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
// 1. โหลดข้อมูลโพสต์จาก Custom Backend REST API
// =========================================================================
async function fetchPosts() {
  if (loadingIndicator) loadingIndicator.classList.remove("hidden");
  if (postsGrid) postsGrid.innerHTML = "";
  if (emptyState) emptyState.classList.add("hidden");

  try {
    const res = await fetch(`${API_BASE}/api/posts`);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    
    const result = await res.json();
    postsData = result.data || [];
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการโหลดข้อมูลจาก Server:", err.message);
    showToast("⚠️ ไม่สามารถเชื่อมต่อ Server ได้ กรุณารัน 'npm start' ในโฟลเดอร์ moodwall");
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

    // ผูกปุ่มกดถูกใจ
    const likeBtn = card.querySelector(".like-btn");
    if (likeBtn) {
      likeBtn.addEventListener("click", () => handleLike(post.id, post.likes || 0, likeBtn));
    }

    postsGrid.appendChild(card);
  });
}

// =========================================================================
// 3. ฟังก์ชันกดหัวใจ (Likes) + ส่งขึ้น Custom Backend
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

  // อัปเดตใน Local data
  const index = postsData.findIndex((p) => p.id === postId);
  if (index !== -1) {
    postsData[index].likes = newLikes;
  }

  // ส่ง API ไปยัง Backend
  try {
    await fetch(`${API_BASE}/api/posts/${postId}/like`, { method: "POST" });
  } catch (err) {
    console.error("อัปเดตยอดไลก์ผิดพลาด:", err.message);
  }

  showToast("❤️ ส่งกำลังใจสำเร็จ!");
}

// =========================================================================
// 4. ระบบ WebSocket Realtime (ซิงค์อัตโนมัติ 100%)
// =========================================================================
let socket = null;

function connectRealtime() {
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
          // มีโพสต์ใหม่เข้ามา
          if (!postsData.some((p) => p.id === payload.id)) {
            postsData.unshift(payload);
            renderPosts();
            showToast("✨ มีข้อความระบายอารมณ์โพสต์ใหม่แบบ Realtime!");
          }
        } else if (eventType === "UPDATE") {
          // มีการแก้ไขข้อมูลหรือยอดไลก์
          const idx = postsData.findIndex((p) => p.id === payload.id);
          if (idx !== -1) {
            postsData[idx] = { ...postsData[idx], ...payload };
            renderPosts();
          }
        } else if (eventType === "DELETE") {
          // มีการลบโพสต์จากหลังบ้าน
          postsData = postsData.filter((p) => p.id !== payload.id);
          renderPosts();
          showToast("🗑️ มีโพสต์ถูกลบออกจากระบบโดยผู้ดูแล");
        } else if (eventType === "RESET") {
          postsData = payload || [];
          renderPosts();
          showToast("🔄 ข้อมูลระบบถูกรีเซ็ตโดยผู้ดูแล");
        }
      } catch (e) {
        console.error("Error processing websocket message:", e);
      }
    };

    socket.onclose = () => {
      console.warn("🔴 Disconnected from Realtime Server. Reconnecting in 3s...");
      if (realtimeStatus) {
        realtimeStatus.innerHTML = `
          <span class="status-dot" style="background:#fbbf24;box-shadow:0 0 10px #fbbf24;"></span>
          <span class="status-text" style="color:#fbbf24;">กำลังเชื่อมต่อใหม่...</span>
        `;
      }
      setTimeout(connectRealtime, 3000);
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
      socket.close();
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
  if (modalBackdrop) {
    modalBackdrop.classList.add("hidden");
  }
  if (confessionForm) {
    confessionForm.reset();
  }
  
  // รีเซ็ตตัวเลือกหมวดอารมณ์กลับเป็น happy
  document.querySelectorAll(".mood-option").forEach((el) => el.classList.remove("selected"));
  const defaultOption = document.querySelector('.mood-option input[value="happy"]')?.closest(".mood-option");
  if (defaultOption) defaultOption.classList.add("selected");

  updateCharCounter();
}

// ผูก Event ปุ่มเปิด Modal ทั้งหมด (Navbar, Hero CTA, Empty state, Floating FAB)
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

// ปิดด้วยปุ่ม Esc
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

  // ส่งฟอร์มด้วยปุ่ม Ctrl+Enter / Cmd+Enter
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

    try {
      const res = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, mood: mood })
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }

      // เพิ่มโพสต์ลงบนหน้าจอทันที (Direct Update ป้องกันกรณี WebSocket ขาดการเชื่อมต่อ)
      if (result.data && !postsData.some((p) => p.id === result.data.id)) {
        postsData.unshift(result.data);
        renderPosts();
      }

      closeModal();
      showToast("✨ โพสต์ระบายความรู้สึกสำเร็จแล้ว!");
    } catch (err) {
      console.error("ส่งข้อความผิดพลาด:", err);
      showToast("❌ ส่งข้อความไม่สำเร็จ: " + (err.message || "ไม่สามารถติดต่อ Server ได้"));
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>🚀 ส่งข้อความ (Live!)</span>`;
      }
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
  if (window.location.protocol === "file:") {
    const fileNotice = document.getElementById("fileNotice");
    if (fileNotice) fileNotice.classList.remove("hidden");
  }
  fetchPosts();
  connectRealtime();
});
