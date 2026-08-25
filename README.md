# ✨ MoodWall — Realtime Confession Wall & Custom Backend Studio

[![NodeJS](https://img.shields.io/badge/Node.js-v24.15.0-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-Backend%20API-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![WebSocket](https://img.shields.io/badge/WebSocket-Realtime%20Live-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
[![Vanilla JS](https://img.shields.io/badge/Built%20with-Vanilla%20JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

พื้นที่ปลอดภัยสำหรับระบายความรู้สึกและอารมณ์ของคุณ ไม่ระบุตัวตน อัปเดตทันทีแบบ **Realtime** บนทุกหน้าจอโดยไม่ต้องกดรีเฟรชหน้าเว็บ ขับเคลื่อนด้วย **Custom Self-Hosted Backend (Node.js + Express + WebSocket)** พร้อมระบบ **Admin Studio หลังบ้าน** สำหรับเจ้าของระบบในการควบคุม แก้ไข และจัดการข้อมูลได้ 100%

---

## 🚀 ฟีเจอร์หลัก (Features)

- 🔴 **Native WebSocket Realtime**: เมื่อมีคนโพสต์ แก้ไข หรือกดหัวใจ ข้อความจะเด้งอัปเดตบนหน้าจอของทุกคนแบบ Realtime ทันที
- 🛡️ **Owner Admin Studio (`admin.html`)**: ระบบหลังบ้านสำหรับเจ้าของระบบ จัดการแก้ไข/ลบ/เพิ่มข้อมูล เหมือน Supabase Studio
- 🗄️ **Self-Hosted JSON Database (`data/posts.json`)**: เก็บข้อมูลถาวรในเครื่อง เจ้าของระบบสามารถเปิดดูหรือแก้ไขไฟล์ JSON ได้โดยตรง
- 🌐 **RESTful API**: ให้บริการ API มาตรฐาน (GET, POST, PUT, DELETE, LIKE, STATS)
- 😊 **Mood Categories & Filters**: แยกประเภทอารมณ์ (มีความสุข / เครียด / ง่วง / มีไฟ / เศร้า) พร้อมตัวกรอง
- ❤️ **Interactive Like Button**: ส่งกำลังใจให้ข้อความที่ชอบ ยอดไลก์วิ่งเรียลไทม์
- 🎨 **Dark Glassmorphism UI**: ดีไซน์โมเดิร์น สวยงามทั้งบนคอมและมือถือ

---

## 🛠️ วิธีติดตั้งและรันโปรเจกต์ (Quick Start)

### 1. เปิด Terminal ในโฟลเดอร์นี้ แล้วรันคำสั่งติดตั้ง (ทำครั้งแรกครั้งเดียว):
```bash
npm install
```

### 2. สั่งรัน Server:
```bash
npm start
```
*(หรือใช้ `node server.js`)*

### 3. เปิดใช้งานผ่านเบราว์เซอร์:
* 🌐 **หน้าบ้าน (Main Wall):** [http://localhost:3000](http://localhost:3000)
* 🛡️ **หลังบ้าน (Admin Studio):** [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

---

## 🔐 การเข้าใช้งานระบบหลังบ้าน (Admin Studio)

1. เข้าไปที่ [http://localhost:3000/admin.html](http://localhost:3000/admin.html) (หรือกดปุ่ม **"⚙️ หลังบ้าน"** จากหน้าแรก)
2. กรอกรหัสผ่านผู้ดูแลระบบ:
   - **รหัสผ่านเริ่มต้น:** `admin1234`
3. สิ่งที่คุณสามารถทำได้ในหน้าหลังบ้าน:
   - 📊 **ดูสถิติรวมแบบ Live**: ยอดโพสต์ทั้งหมด, ยอดไลก์รวม, อารมณ์ที่มีคนโพสต์มากที่สุด
   - ✏️ **แก้ไขข้อมูล (Edit Row)**: เปลี่ยนข้อความ, เปลี่ยนหมวดอารมณ์, ปรับแก้จำนวนไลก์ แล้วกดบันทึก ข้อมูลบนหน้าเว็บทุกคนจะเปลี่ยนตามทันที!
   - 🗑️ **ลบข้อมูล (Delete Row)**: ลบโพสต์ที่ไม่ต้องการ โพสต์จะหายไปจากจอทุกคนทันที
   - ➕ **เพิ่มข้อมูลใหม่ (Insert Row)**: สร้างโพสต์ใหม่จากหลังบ้านโดยตรง
   - ⚠️ **รีเซ็ตฐานข้อมูล (Reset Database)**: รีเซ็ตข้อมูลกลับเป็นค่าเริ่มต้น

---

## 🗄️ โครงสร้างฐานข้อมูลและการแก้ไขไฟล์ตรง (Direct DB Edit)

ข้อมูลทั้งหมดจะถูกจัดเก็บไว้ที่ไฟล์:
📁 `data/posts.json`

โครงสร้างข้อมูลแต่ละแถว:
```json
{
  "id": "post-1",
  "content": "ข้อความระบายความรู้สึก...",
  "mood": "happy",
  "likes": 28,
  "created_at": "2026-08-25T14:30:00.000Z"
}
```

---

## 📡 สรุป REST API Endpoints

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| `GET` | `/api/posts` | ดึงข้อมูลโพสต์ทั้งหมด (เรียงจากใหม่สุด) |
| `POST` | `/api/posts` | สร้างโพสต์ใหม่ (ส่ง `{ content, mood }`) |
| `PUT` | `/api/posts/:id` | แก้ไขข้อมูลโพสต์ (ส่ง `{ content, mood, likes }`) |
| `POST` | `/api/posts/:id/like` | เพิ่มยอดไลก์ (+1) |
| `DELETE` | `/api/posts/:id` | ลบโพสต์ออกจากฐานข้อมูล |
| `GET` | `/api/stats` | ดึงสถิติรวมของระบบ |
| `POST` | `/api/admin/reset` | รีเซ็ตข้อมูลกลับเป็นค่าเริ่มต้น |
