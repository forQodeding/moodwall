// =========================================================================
// MoodWall Studio — Custom Backend Admin Script
// ควบคุมและจัดการฐานข้อมูล Server แบบ Realtime (Table Editor & Stats)
// =========================================================================

const API_BASE = window.location.origin && window.location.origin.startsWith("http")
  ? window.location.origin
  : "http://localhost:3000";

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
    authGate.classList.add("hidden");
    adminDashboard.classList.remove("hidden");
    logoutBtn.style.display = "inline-flex";
    initAdminData();
  } else {
    authGate.classList.remove("hidden");
    adminDashboard.classList.add("hidden");
    logoutBtn.style.display = "none";
  }
}

adminLoginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const inputPass = adminPassInput.value.trim();
  const validPass = localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_PASS;

  if (inputPass === validPass) {
    sessionStorage.setItem("moodwall_admin_authed", "true");
    showToast("🔓 เข้าสู่ระบบผู้ดูแลหลังบ้านสำเร็จ!");
    checkAuthStatus();
  } else {
    showToast("❌ รหัสผ่านไม่ถูกต้อง (รหัสเริ่มต้น: admin1234)");
    adminPassInput.value = "";
    adminPassInput.focus();
  }
});

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem("moodwall_admin_authed");
  showToast("🚪 ออกจากระบบเรียบร้อย");
  checkAuthStatus();
});

// =========================================================================
// 2. ดึงข้อมูลจาก Custom Backend & คำนวณสถิติ
// =========================================================================
async function initAdminData() {
  await fetchAdminPosts();
  connectAdminRealtime();
}

async function fetchAdminPosts() {
  adminTableLoading.classList.remove("hidden");
  adminTableEmpty.classList.add("hidden");
  adminPostsTableBody.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/api/posts`);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const result = await res.json();
    allPosts = result.data || [];
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการโหลดข้อมูล:", err.message);
    showToast("❌ โหลดข้อมูลล้มเหลว ตรวจสอบว่าได้รัน server.js หรือไม่");
  }

  adminTableLoading.classList.add("hidden");
  updateStats();
  renderAdminTable();
}

function updateStats() {
  totalPostsStat.textContent = allPosts.length;
  
  const totalLikes = allPosts.reduce((sum, p) => sum + (p.likes || 0), 0);
  totalLikesStat.textContent = totalLikes.toLocaleString();

  if (allPosts.length === 0) {
    topMoodStat.textContent = "-";
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
  topMoodStat.textContent = `${moodInfo.emoji} ${moodInfo.label} (${maxCount})`;
}

// =========================================================================
// 3. แสดงผลตารางจัดการข้อมูล (Table Editor)
// =========================================================================
function renderAdminTable() {
  adminPostsTableBody.innerHTML = "";

  const filtered = allPosts.filter((post) => {
    const matchMood = currentMoodFilter === "all" || post.mood === currentMoodFilter;
    const matchSearch = currentSearch === "" || 
      (post.content && post.content.toLowerCase().includes(currentSearch.toLowerCase())) ||
      (post.id && post.id.toLowerCase().includes(currentSearch.toLowerCase()));
    return matchMood && matchSearch;
  });

  if (filtered.length === 0) {
    adminTableEmpty.classList.remove("hidden");
    return;
  }

  adminTableEmpty.classList.add("hidden");

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

    editBtn.addEventListener("click", () => openEditModal(post));
    deleteBtn.addEventListener("click", () => handleDeletePost(post.id));

    adminPostsTableBody.appendChild(tr);
  });
}

// =========================================================================
// 4. ค้นหาและกรองข้อมูล (Search & Filter)
// =========================================================================
adminSearchInput.addEventListener("input", (e) => {
  currentSearch = e.target.value.trim();
  renderAdminTable();
});

adminMoodFilter.addEventListener("change", (e) => {
  currentMoodFilter = e.target.value;
  renderAdminTable();
});

refreshBtn.addEventListener("click", async () => {
  refreshBtn.disabled = true;
  refreshBtn.innerHTML = "<span>⏳ โหลด...</span>";
  await fetchAdminPosts();
  refreshBtn.disabled = false;
  refreshBtn.innerHTML = "<span>🔄 รีเฟรช</span>";
  showToast("🔄 โหลดข้อมูลล่าสุดจาก Server แล้ว");
});

// =========================================================================
// 5. การแก้ไขข้อมูลโพสต์ (Edit Post)
// =========================================================================
function openEditModal(post) {
  editPostId.value = post.id;
  editContentText.value = post.content;
  editLikesInput.value = post.likes || 0;

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
  editContentText.focus();
}

function closeEditModal() {
  editModalBackdrop.classList.add("hidden");
  editPostForm.reset();
}

closeEditModalBtn.addEventListener("click", closeEditModal);
cancelEditBtn.addEventListener("click", closeEditModal);
editModalBackdrop.addEventListener("click", (e) => {
  if (e.target === editModalBackdrop) closeEditModal();
});

editMoodSelector.addEventListener("click", (e) => {
  const label = e.target.closest(".mood-option");
  if (!label) return;
  document.querySelectorAll("#editMoodSelector .mood-option").forEach((el) => el.classList.remove("selected"));
  label.classList.add("selected");
});

editPostForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const postId = editPostId.value;
  const newContent = editContentText.value.trim();
  const newLikes = parseInt(editLikesInput.value, 10) || 0;
  const selectedMoodEl = document.querySelector('input[name="editMood"]:checked');
  const newMood = selectedMoodEl ? selectedMoodEl.value : "happy";

  if (!newContent) return;

  const saveBtn = document.getElementById("saveEditBtn");
  saveBtn.disabled = true;
  saveBtn.innerHTML = "<span>⏳ กำลังบันทึก...</span>";

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

    if (!res.ok) throw new Error("Update failed");

    closeEditModal();
    showToast("💾 บันทึกการแก้ไขลงฐานข้อมูลสำเร็จ!");
  } catch (err) {
    console.error("แก้ไขข้อมูลล้มเหลว:", err.message);
    showToast("❌ แก้ไขข้อมูลล้มเหลว: " + err.message);
  }

  saveBtn.disabled = false;
  saveBtn.innerHTML = "<span>💾 บันทึกการแก้ไข (Update)</span>";
});

// =========================================================================
// 6. การเพิ่มโพสต์ใหม่จากหลังบ้าน (Insert Row)
// =========================================================================
function openInsertModal() {
  insertModalBackdrop.classList.remove("hidden");
  insertContentText.focus();
}

function closeInsertModal() {
  insertModalBackdrop.classList.add("hidden");
  insertPostForm.reset();
}

openInsertModalBtn.addEventListener("click", openInsertModal);
closeInsertModalBtn.addEventListener("click", closeInsertModal);
cancelInsertBtn.addEventListener("click", closeInsertModal);
insertModalBackdrop.addEventListener("click", (e) => {
  if (e.target === insertModalBackdrop) closeInsertModal();
});

insertMoodSelector.addEventListener("click", (e) => {
  const label = e.target.closest(".mood-option");
  if (!label) return;
  document.querySelectorAll("#insertMoodSelector .mood-option").forEach((el) => el.classList.remove("selected"));
  label.classList.add("selected");
});

insertPostForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = insertContentText.value.trim();
  if (!text) return;

  const selectedMoodEl = document.querySelector('input[name="insertMood"]:checked');
  const mood = selectedMoodEl ? selectedMoodEl.value : "happy";

  const saveBtn = document.getElementById("saveInsertBtn");
  saveBtn.disabled = true;
  saveBtn.innerHTML = "<span>⏳ กำลังบันทึก...</span>";

  try {
    const res = await fetch(`${API_BASE}/api/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, mood: mood })
    });

    if (!res.ok) throw new Error("Insert failed");

    closeInsertModal();
    showToast("➕ เพิ่มข้อมูลใหม่ลงฐานข้อมูลสำเร็จ!");
  } catch (err) {
    console.error("เพิ่มข้อมูลล้มเหลว:", err.message);
    showToast("❌ เพิ่มข้อมูลล้มเหลว: " + err.message);
  }

  saveBtn.disabled = false;
  saveBtn.innerHTML = "<span>➕ บันทึกข้อมูลใหม่ (Insert)</span>";
});

// =========================================================================
// 7. การลบโพสต์ (Delete Post) & รีเซ็ตฐานข้อมูล
// =========================================================================
async function handleDeletePost(postId) {
  const confirmDelete = confirm("⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบโพสต์นี้ออกจากฐานข้อมูลอย่างถาวร?");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API_BASE}/api/posts/${postId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
    showToast("🗑️ ลบโพสต์ออกจากฐานข้อมูลสำเร็จ!");
  } catch (err) {
    console.error("ลบโพสต์ผิดพลาด:", err.message);
    showToast("❌ ลบโพสต์ผิดพลาด: " + err.message);
  }
}

resetDbBtn.addEventListener("click", async () => {
  const confirmReset = confirm("⚠️ คำเตือน: คุณต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นโพสต์ตั้งต้นของระบบใช่หรือไม่?");
  if (!confirmReset) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/reset`, { method: "POST" });
    if (!res.ok) throw new Error("Reset failed");
    showToast("🔄 รีเซ็ตฐานข้อมูลกลับเป็นค่าเริ่มต้นสำเร็จ!");
  } catch (err) {
    console.error("รีเซ็ตล้มเหลว:", err.message);
    showToast("❌ รีเซ็ตล้มเหลว: " + err.message);
  }
});

// =========================================================================
// 8. WebSocket Realtime สำหรับหน้าแอดมิน
// =========================================================================
let adminSocket = null;

function connectAdminRealtime() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host || "localhost:3000";
  const wsUrl = `${protocol}//${host}`;

  try {
    adminSocket = new WebSocket(wsUrl);

    adminSocket.onopen = () => {
      console.log("🟢 Admin Realtime WebSocket Connected");
      adminRealtimeStatus.innerHTML = `
        <span class="status-dot"></span>
        <span class="status-text">Realtime Live</span>
      `;
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
      adminRealtimeStatus.innerHTML = `
        <span class="status-dot" style="background:#fbbf24;box-shadow:0 0 10px #fbbf24;"></span>
        <span class="status-text" style="color:#fbbf24;">กำลังเชื่อมต่อใหม่...</span>
      `;
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
