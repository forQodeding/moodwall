// =========================================================================
// MoodWall Studio — Custom Backend Admin Script
// ควบคุมและจัดการฐานข้อมูล Server แบบ Realtime (Table Editor & Stats)
// =========================================================================

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

// Mood Mapping
const MOOD_MAP = {
  happy:    { label: "มีความสุข", emoji: "😊", class: "happy" },
  stressed: { label: "เครียด/งานเยอะ", emoji: "🤯", class: "stressed" },
  sleepy:   { label: "ง่วงนอน/เพลีย", emoji: "😴", class: "sleepy" },
  fire:     { label: "มีไฟ/สู้ตาย", emoji: "🔥", class: "fire" },
  sad:      { label: "ต้องการกำลังใจ", emoji: "😭", class: "sad" },
};

// Application State
let allPosts = [];
let currentSearch = "";
let currentMoodFilter = "all";

// DOM Elements
const authGate = document.getElementById("authGate");
const adminDashboard = document.getElementById("adminDashboard");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminPassInput = document.getElementById("adminPassInput");
const logoutBtn = document.getElementById("logoutBtn");

const totalPostsStat = document.getElementById("totalPostsStat");
const totalLikesStat = document.getElementById("totalLikesStat");
const topMoodStat = document.getElementById("topMoodStat");
const adminRealtimeStatus = document.getElementById("adminRealtimeStatus");

const adminSearchInput = document.getElementById("adminSearchInput");
const adminMoodFilter = document.getElementById("adminMoodFilter");
const refreshBtn = document.getElementById("refreshBtn");
const resetDbBtn = document.getElementById("resetDbBtn");
const openInsertModalBtn = document.getElementById("openInsertModalBtn");
const adminPostsTableBody = document.getElementById("adminPostsTableBody");
const adminTableLoading = document.getElementById("adminTableLoading");
const adminTableEmpty = document.getElementById("adminTableEmpty");

// Edit Modal Elements
const editModalBackdrop = document.getElementById("editModalBackdrop");
const editPostForm = document.getElementById("editPostForm");
const editPostId = document.getElementById("editPostId");
const editContentText = document.getElementById("editContentText");
const editLikesInput = document.getElementById("editLikesInput");
const closeEditModalBtn = document.getElementById("closeEditModalBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const editMoodSelector = document.getElementById("editMoodSelector");

// Insert Modal Elements
const insertModalBackdrop = document.getElementById("insertModalBackdrop");
const insertPostForm = document.getElementById("insertPostForm");
const insertContentText = document.getElementById("insertContentText");
const closeInsertModalBtn = document.getElementById("closeInsertModalBtn");
const cancelInsertBtn = document.getElementById("cancelInsertBtn");
const insertMoodSelector = document.getElementById("insertMoodSelector");

// Toast
const toast = document.getElementById("toast");

// =========================================================================
// 1. ระบบยืนยันตัวตนแอดมิน (Admin Passcode Auth)
// =========================================================================
const ADMIN_PASSWORD_KEY = "moodwall_admin_pass";
const DEFAULT_PASS = "admin1234";

function checkAuthStatus() {
  const isAuth = sessionStorage.getItem("moodwall_admin_authed") === "true";
  if (isAuth) {
    if (authGate) authGate.classList.add("hidden");
    if (adminDashboard) adminDashboard.classList.remove("hidden");
    if (logoutBtn) logoutBtn.style.display = "inline-flex";
    initAdminData();
  } else {
    if (authGate) authGate.classList.remove("hidden");
    if (adminDashboard) adminDashboard.classList.add("hidden");
    if (logoutBtn) logoutBtn.style.display = "none";
  }
}

if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const inputPass = adminPassInput ? adminPassInput.value.trim() : "";
    const validPass = localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_PASS;

    if (inputPass === validPass) {
      sessionStorage.setItem("moodwall_admin_authed", "true");
      showToast("🔓 เข้าสู่ระบบผู้ดูแลหลังบ้านสำเร็จ!");
      checkAuthStatus();
    } else {
      showToast("❌ รหัสผ่านไม่ถูกต้อง (รหัสเริ่มต้น: admin1234)");
      if (adminPassInput) {
        adminPassInput.value = "";
        adminPassInput.focus();
      }
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("moodwall_admin_authed");
    showToast("🚪 ออกจากระบบเรียบร้อย");
    checkAuthStatus();
  });
}

// =========================================================================
// 2. ดึงข้อมูลจาก Custom Backend & คำนวณสถิติ
// =========================================================================
async function initAdminData() {
  await fetchAdminPosts();
  connectAdminRealtime();
}

async function fetchAdminPosts() {
  if (adminTableLoading) adminTableLoading.classList.remove("hidden");
  if (adminTableEmpty) adminTableEmpty.classList.add("hidden");
  if (adminPostsTableBody) adminPostsTableBody.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/api/posts`);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const result = await res.json();
    allPosts = result.data || [];
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการโหลดข้อมูล:", err.message);
    showToast("❌ โหลดข้อมูลล้มเหลว ตรวจสอบว่าได้รัน server.js หรือไม่");
  }

  if (adminTableLoading) adminTableLoading.classList.add("hidden");
  updateStats();
  renderAdminTable();
}

function updateStats() {
  if (totalPostsStat) totalPostsStat.textContent = allPosts.length;
  
  const totalLikes = allPosts.reduce((sum, p) => sum + (p.likes || 0), 0);
  if (totalLikesStat) totalLikesStat.textContent = totalLikes.toLocaleString();

  if (allPosts.length === 0) {
    if (topMoodStat) topMoodStat.textContent = "-";
    return;
  }

  const moodCounts = {};
  allPosts.forEach((p) => {
    moodCounts[p.mood] = (moodCounts[p.mood] || 0) + 1;
  });

  let maxMood = "happy";
  let maxCount = 0;
  for (const [m, count] of Object.entries(moodCounts)) {
    if (count > maxCount) {
      maxCount = count;
      maxMood = m;
    }
  }

  const moodInfo = MOOD_MAP[maxMood] || MOOD_MAP.happy;
  if (topMoodStat) topMoodStat.textContent = `${moodInfo.emoji} ${moodInfo.label} (${maxCount})`;
}

// =========================================================================
// 3. แสดงผลตารางจัดการข้อมูล (Table Editor)
// =========================================================================
function renderAdminTable() {
  if (!adminPostsTableBody) return;
  adminPostsTableBody.innerHTML = "";

  const filtered = allPosts.filter((post) => {
    const matchMood = currentMoodFilter === "all" || post.mood === currentMoodFilter;
    const matchSearch = currentSearch === "" || 
      (post.content && post.content.toLowerCase().includes(currentSearch.toLowerCase())) ||
      (post.id && post.id.toLowerCase().includes(currentSearch.toLowerCase()));
    return matchMood && matchSearch;
  });

  if (filtered.length === 0) {
    if (adminTableEmpty) adminTableEmpty.classList.remove("hidden");
    return;
  }

  if (adminTableEmpty) adminTableEmpty.classList.add("hidden");

  filtered.forEach((post) => {
    const tr = document.createElement("tr");
    tr.id = `row-${post.id}`;

    const moodInfo = MOOD_MAP[post.mood] || MOOD_MAP.happy;
    const formattedDate = new Date(post.created_at).toLocaleString("th-TH", {
      dateStyle: "short",
      timeStyle: "short"
    });

    tr.innerHTML = `
      <td>
        <span class="mood-badge ${moodInfo.class}">
          <span>${moodInfo.emoji}</span>
          <span>${moodInfo.label}</span>
        </span>
      </td>
      <td>
        <div class="table-content-preview">${escapeHTML(post.content)}</div>
        <small style="color: var(--text-dim); font-size: 11px;">ID: ${post.id}</small>
      </td>
      <td>
        <strong style="color: #fb7185;">❤️ ${post.likes || 0}</strong>
      </td>
      <td style="color: var(--text-dim); font-size: 13px; white-space: nowrap;">
        ${formattedDate}
      </td>
      <td style="text-align: right;">
        <div class="action-btns" style="justify-content: flex-end;">
          <button class="btn-action-edit" data-id="${post.id}">
            <span>✏️ แก้ไข</span>
          </button>
          <button class="btn-action-delete" data-id="${post.id}">
            <span>🗑️ ลบ</span>
          </button>
        </div>
      </td>
    `;

    // ผูกปุ่ม Edit & Delete
    const editBtn = tr.querySelector(".btn-action-edit");
    const deleteBtn = tr.querySelector(".btn-action-delete");

    if (editBtn) editBtn.addEventListener("click", () => openEditModal(post));
    if (deleteBtn) deleteBtn.addEventListener("click", () => handleDeletePost(post.id));

    adminPostsTableBody.appendChild(tr);
  });
}

// =========================================================================
// 4. ค้นหาและกรองข้อมูล (Search & Filter)
// =========================================================================
if (adminSearchInput) {
  adminSearchInput.addEventListener("input", (e) => {
    currentSearch = e.target.value.trim();
    renderAdminTable();
  });
}

if (adminMoodFilter) {
  adminMoodFilter.addEventListener("change", (e) => {
    currentMoodFilter = e.target.value;
    renderAdminTable();
  });
}

if (refreshBtn) {
  refreshBtn.addEventListener("click", async () => {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = "<span>⏳ โหลด...</span>";
    await fetchAdminPosts();
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = "<span>🔄 รีเฟรช</span>";
    showToast("🔄 โหลดข้อมูลล่าสุดจาก Server แล้ว");
  });
}

// =========================================================================
// 5. การแก้ไขข้อมูลโพสต์ (Edit Post)
// =========================================================================
function openEditModal(post) {
  if (!editModalBackdrop) return;
  if (editPostId) editPostId.value = post.id;
  if (editContentText) editContentText.value = post.content;
  if (editLikesInput) editLikesInput.value = post.likes || 0;

  const radio = document.querySelector(`input[name="editMood"][value="${post.mood}"]`);
  if (radio) radio.checked = true;
  
  document.querySelectorAll("#editMoodSelector .mood-option").forEach((el) => {
    const input = el.querySelector("input");
    if (input && input.value === post.mood) {
      el.classList.add("selected");
    } else {
      el.classList.remove("selected");
    }
  });

  editModalBackdrop.classList.remove("hidden");
  if (editContentText) editContentText.focus();
}

function closeEditModal() {
  if (editModalBackdrop) editModalBackdrop.classList.add("hidden");
  if (editPostForm) editPostForm.reset();
}

if (closeEditModalBtn) closeEditModalBtn.addEventListener("click", closeEditModal);
if (cancelEditBtn) cancelEditBtn.addEventListener("click", closeEditModal);
if (editModalBackdrop) {
  editModalBackdrop.addEventListener("click", (e) => {
    if (e.target === editModalBackdrop) closeEditModal();
  });
}

if (editMoodSelector) {
  editMoodSelector.addEventListener("click", (e) => {
    const label = e.target.closest(".mood-option");
    if (!label) return;
    document.querySelectorAll("#editMoodSelector .mood-option").forEach((el) => el.classList.remove("selected"));
    label.classList.add("selected");
    const radio = label.querySelector("input");
    if (radio) radio.checked = true;
  });
}

if (editPostForm) {
  editPostForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const postId = editPostId ? editPostId.value : "";
    const newContent = editContentText ? editContentText.value.trim() : "";
    const newLikes = editLikesInput ? (parseInt(editLikesInput.value, 10) || 0) : 0;
    const selectedMoodEl = document.querySelector('input[name="editMood"]:checked');
    const newMood = selectedMoodEl ? selectedMoodEl.value : "happy";

    if (!newContent) {
      showToast("⚠️ กรุณากรอกข้อความ");
      return;
    }

    const saveBtn = document.getElementById("saveEditBtn");
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = "<span>⏳ กำลังบันทึก...</span>";
    }

    try {
      const res = await fetch(`${API_BASE}/api/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newContent,
          mood: newMood,
          likes: newLikes
        })
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Update failed");
      }

      // อัปเดตในตารางทันที
      const idx = allPosts.findIndex((p) => p.id === postId);
      if (idx !== -1 && result.data) {
        allPosts[idx] = result.data;
        updateStats();
        renderAdminTable();
      }

      closeEditModal();
      showToast("💾 บันทึกการแก้ไขลงฐานข้อมูลสำเร็จ!");
    } catch (err) {
      console.error("แก้ไขข้อมูลล้มเหลว:", err);
      showToast("❌ แก้ไขข้อมูลล้มเหลว: " + (err.message || "ไม่สามารถติดต่อ Server ได้"));
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = "<span>💾 บันทึกการแก้ไข (Update)</span>";
      }
    }
  });
}

// =========================================================================
// 6. การเพิ่มโพสต์ใหม่จากหลังบ้าน (Insert Row)
// =========================================================================
function openInsertModal() {
  if (insertModalBackdrop) {
    insertModalBackdrop.classList.remove("hidden");
    if (insertContentText) insertContentText.focus();
  }
}

function closeInsertModal() {
  if (insertModalBackdrop) insertModalBackdrop.classList.add("hidden");
  if (insertPostForm) insertPostForm.reset();
  document.querySelectorAll("#insertMoodSelector .mood-option").forEach((el) => el.classList.remove("selected"));
  const defaultOption = document.querySelector('#insertMoodSelector .mood-option input[value="happy"]')?.closest(".mood-option");
  if (defaultOption) defaultOption.classList.add("selected");
}

if (openInsertModalBtn) openInsertModalBtn.addEventListener("click", openInsertModal);
if (closeInsertModalBtn) closeInsertModalBtn.addEventListener("click", closeInsertModal);
if (cancelInsertBtn) cancelInsertBtn.addEventListener("click", closeInsertModal);
if (insertModalBackdrop) {
  insertModalBackdrop.addEventListener("click", (e) => {
    if (e.target === insertModalBackdrop) closeInsertModal();
  });
}

if (insertMoodSelector) {
  insertMoodSelector.addEventListener("click", (e) => {
    const label = e.target.closest(".mood-option");
    if (!label) return;
    document.querySelectorAll("#insertMoodSelector .mood-option").forEach((el) => el.classList.remove("selected"));
    label.classList.add("selected");
    const radio = label.querySelector("input");
    if (radio) radio.checked = true;
  });
}

if (insertPostForm) {
  insertPostForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = insertContentText ? insertContentText.value.trim() : "";
    if (!text) {
      showToast("⚠️ กรุณากรอกข้อความ");
      return;
    }

    const selectedMoodEl = document.querySelector('input[name="insertMood"]:checked');
    const mood = selectedMoodEl ? selectedMoodEl.value : "happy";

    const saveBtn = document.getElementById("saveInsertBtn");
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = "<span>⏳ กำลังบันทึก...</span>";
    }

    try {
      const res = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, mood: mood })
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Insert failed");
      }

      if (result.data && !allPosts.some((p) => p.id === result.data.id)) {
        allPosts.unshift(result.data);
        updateStats();
        renderAdminTable();
      }

      closeInsertModal();
      showToast("➕ เพิ่มข้อมูลใหม่ลงฐานข้อมูลสำเร็จ!");
    } catch (err) {
      console.error("เพิ่มข้อมูลล้มเหลว:", err);
      showToast("❌ เพิ่มข้อมูลล้มเหลว: " + (err.message || "ไม่สามารถติดต่อ Server ได้"));
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = "<span>➕ บันทึกข้อมูลใหม่ (Insert)</span>";
      }
    }
  });
}

// =========================================================================
// 7. การลบโพสต์ (Delete Post) & รีเซ็ตฐานข้อมูล
// =========================================================================
async function handleDeletePost(postId) {
  const confirmDelete = confirm("⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบโพสต์นี้ออกจากฐานข้อมูลอย่างถาวร?");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API_BASE}/api/posts/${postId}`, { method: "DELETE" });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.error || "Delete failed");
    }

    allPosts = allPosts.filter((p) => p.id !== postId);
    updateStats();
    renderAdminTable();
    showToast("🗑️ ลบโพสต์ออกจากฐานข้อมูลสำเร็จ!");
  } catch (err) {
    console.error("ลบโพสต์ผิดพลาด:", err);
    showToast("❌ ลบโพสต์ผิดพลาด: " + (err.message || "ไม่สามารถติดต่อ Server ได้"));
  }
}

if (resetDbBtn) {
  resetDbBtn.addEventListener("click", async () => {
    const confirmReset = confirm("⚠️ คำเตือน: คุณต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นโพสต์ตั้งต้นของระบบใช่หรือไม่?");
    if (!confirmReset) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/reset`, { method: "POST" });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Reset failed");
      }

      if (result.data) {
        allPosts = result.data;
        updateStats();
        renderAdminTable();
      }
      showToast("🔄 รีเซ็ตฐานข้อมูลกลับเป็นค่าเริ่มต้นสำเร็จ!");
    } catch (err) {
      console.error("รีเซ็ตล้มเหลว:", err);
      showToast("❌ รีเซ็ตล้มเหลว: " + (err.message || "ไม่สามารถติดต่อ Server ได้"));
    }
  });
}

// =========================================================================
// 8. WebSocket Realtime สำหรับหน้าแอดมิน
// =========================================================================
let adminSocket = null;

function connectAdminRealtime() {
  const wsUrl = getWebSocketUrl();

  try {
    adminSocket = new WebSocket(wsUrl);

    adminSocket.onopen = () => {
      console.log("🟢 Admin Realtime WebSocket Connected via " + wsUrl);
      if (adminRealtimeStatus) {
        adminRealtimeStatus.innerHTML = `
          <span class="status-dot"></span>
          <span class="status-text">Realtime Live</span>
        `;
      }
    };

    adminSocket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { event: eventType, payload } = msg;

        if (eventType === "INSERT") {
          if (!allPosts.some((p) => p.id === payload.id)) {
            allPosts.unshift(payload);
            updateStats();
            renderAdminTable();
            showToast("✨ มีผู้ใช้โพสต์ข้อความใหม่เข้ามาสดๆ ร้อนๆ!");
          }
        } else if (eventType === "UPDATE") {
          const idx = allPosts.findIndex((p) => p.id === payload.id);
          if (idx !== -1) {
            allPosts[idx] = { ...allPosts[idx], ...payload };
            updateStats();
            renderAdminTable();
          }
        } else if (eventType === "DELETE") {
          allPosts = allPosts.filter((p) => p.id !== payload.id);
          updateStats();
          renderAdminTable();
        } else if (eventType === "RESET") {
          allPosts = payload || [];
          updateStats();
          renderAdminTable();
        }
      } catch (e) {
        console.error("Error handling admin websocket message:", e);
      }
    };

    adminSocket.onclose = () => {
      if (adminRealtimeStatus) {
        adminRealtimeStatus.innerHTML = `
          <span class="status-dot" style="background:#fbbf24;box-shadow:0 0 10px #fbbf24;"></span>
          <span class="status-text" style="color:#fbbf24;">กำลังเชื่อมต่อใหม่...</span>
        `;
      }
      setTimeout(connectAdminRealtime, 3000);
    };

    adminSocket.onerror = (err) => {
      console.error("Admin WebSocket error:", err);
      adminSocket.close();
    };
  } catch (err) {
    console.error("Admin WebSocket connection error:", err);
  }
}

// =========================================================================
// 9. Helper Functions
// =========================================================================
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
// 10. Initial Load
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
  checkAuthStatus();
});
