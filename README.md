# ✨ MoodWall — Realtime Confession Wall & Custom Backend Studio

<div align="center">

![MoodWall Banner](https://img.shields.io/badge/MoodWall-v2.0-8b5cf6?style=for-the-badge&logo=slack&logoColor=white)
[![NodeJS](https://img.shields.io/badge/Node.js-v24.15.0-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.21.2-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![WebSocket](https://img.shields.io/badge/WebSocket-Native%20Realtime-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
[![JavaScript](https://img.shields.io/badge/Vanilla-JavaScript%20ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<p align="center">
  <b>พื้นที่ปลอดภัยสำหรับระบายความรู้สึกและอารมณ์ของคุณ ไม่ระบุตัวตน อัปเดตทันทีแบบ Realtime</b><br>
  ขับเคลื่อนด้วย <b>Self-Hosted Custom Backend (Node.js + Express + WebSocket)</b><br>
  พร้อมระบบ <b>Admin Studio</b> จัดการฐานข้อมูลและสถิติแบบเรียลไทม์ 100%
</p>

[✨ คุณสมบัติหลัก](#-คุณสมบัติหลัก-features) •
[🚀 เริ่มต้นใช้งาน](#-วิธีติดตั้งและเริ่มต้นใช้งาน-quick-start) •
[🛡️ ระบบหลังบ้าน](#-ระบบหลังบ้าน-admin-studio) •
[📡 REST API](#-restful-api-endpoints) •
[⚡ WebSocket Protocol](#-websocket-realtime-protocol) •
[📁 โครงสร้างโปรเจกต์](#-โครงสร้างโปรเจกต์-project-structure)

</div>

---

## 🌟 ภาพรวมโปรเจกต์ (Overview)

**MoodWall** เป็นเว็บแอปพลิเคชันกระดานระบายความรู้สึกแบบเรียลไทม์ (Anonymous Realtime Mood & Confession Board) ที่พัฒนาขึ้นโดยไม่ต้องพึ่งพาบริการ Third-party BaaS (เช่น Firebase หรือ Supabase) แต่ใช้ **Custom Self-Hosted Architecture** ที่สร้างขึ้นเองทั้งหมดด้วย **Node.js, Express และ WebSocket Server** รองรับการซิงค์ข้อมูลสดระหว่างทุก Client และมีระบบ **Admin Studio หลังบ้าน** สำหรับผู้ดูแลระบบ

`
 ┌──────────────────────┐               ┌──────────────────────┐
 │   Main Wall Client   │ ◄──WebSocket──┤  Node.js Server      │
 │   (index.html / JS)  │ ───REST API──►│  (Express + WS)      │
 └──────────────────────┘               └──────────┬───────────┘
                                                   │ File IO
 ┌──────────────────────┐                          ▼
 │  Admin Studio Client │ ◄──WebSocket──┬──────────────────────┐
 │   (admin.html / JS)  │ ───REST API──►│   data/posts.json    │
 └──────────────────────┘               │ (Persistent Database)│
                                        └──────────────────────┘
`

---

## ✨ คุณสมบัติหลัก (Features)

### 🎨 1. หน้าบ้าน (Main Confession Wall)
- 📝 **โพสต์ความรู้สึกแบบไม่ระบุตัวตน (Anonymous)**: ใส่ข้อความ เลือกหมวดอารมณ์ แล้วโพสต์ได้ทันที
- 🎭 **5 หมวดหมู่อารมณ์**:
  - 😄 **มีความสุข (Happy)**
  - 😫 **เครียด/กดดัน (Stressed)**
  - 😴 **ง่วง/หมดพลัง (Sleepy)**
  - 🔥 **มีไฟ/สู้ตาย (Fire)**
  - 😢 **เศร้า/เหงา (Sad)**
- 🔍 **ตัวกรองอารมณ์ (Mood Filter)**: ฟิลเตอร์ดูเฉพาะโพสต์ในหมวดที่ต้องการได้ทันที
- ❤️ **Interactive Like Button**: ส่งกำลังใจให้ข้อความที่ชอบ โดยจำนวนยอดไลก์จะวิ่งอัปเดตแบบเรียลไทม์
- 💎 **Modern Dark Glassmorphism UI**: ดีไซน์โปร่งแสง พรีเมียม พร้อม Animation และ Responsive รองรับทุกขนาดหน้าจอ

### ⚡ 2. ระบบ Realtime ด้วย Native WebSocket
- เมื่อมีผู้ใช้โพสต์ใหม่, กดไลก์, หรือผู้ดูแลระบบแก้ไข/ลบโพสต์จากหลังบ้าน ข้อมูลจะ **อัปเดตบนหน้าจอของทุกคนแบบ Realtime ทันทีโดยไม่ต้องกด Refresh**

### 🛡️ 3. ระบบหลังบ้าน (Owner Admin Studio)
- 🔐 **ระบบล็อกอินด้วยรหัสผ่านผู้ดูแลระบบ**: ป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต
- 📊 **Dashboard สถิติสด (Live Metrics)**: แสดงยอดโพสต์รวม, ยอดไลก์รวม, และสัดส่วนอารมณ์ยอดนิยม
- ✏️ **ตารางจัดการข้อมูล (Data Grid & CRUD)**:
  - **Create**: เพิ่มโพสต์ใหม่จากหลังบ้าน
  - **Read**: ค้นหาและดูข้อมูลทั้งหมด
  - **Update**: แก้ไขข้อความ, เปลี่ยนหมวดอารมณ์ หรือปรับแก้จำนวนไลก์ได้โดยตรง
  - **Delete**: ลบโพสต์ที่ไม่เหมาะสม
  - 🔄 **Reset Database**: กู้คืนข้อมูลตัวอย่างเริ่มต้นได้ด้วยคลิกเดียว

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

`	ext
moodwall/
├── data/
│   └── posts.json          # ไฟล์ฐานข้อมูลจำลอง (Persistent JSON Database)
├── index.html              # หน้าบ้านหลัก (Main Wall)
├── script.js               # สคริปต์หน้าบ้าน & การเชื่อมต่อ WebSocket Client
├── style.css               # สไตล์ชีต Dark Glassmorphism & UI Animation
├── admin.html              # หน้าแอดมินสตูดิโอ (Admin Studio)
├── admin.js                # สคริปต์จัดการ CRUD & Dashboard หลังบ้าน
├── server.js               # Custom Backend (Express API + WebSocket Server)
├── schema.sql              # เอกสารออกแบบโครงสร้างฐานข้อมูล SQL
├── package.json            # การตั้งค่า dependencies และ npm scripts
├── .gitignore              # ละเว้นโฟลเดอร์ node_modules จากการ commit
└── README.md               # คู่มือการใช้งานและเอกสารประกอบโปรเจกต์
`

---

## 🚀 วิธีติดตั้งและเริ่มต้นใช้งาน (Quick Start)

### ความต้องการของระบบ (Prerequisites)
- **Node.js**: เวอร์ชัน 18.0.0 หรือใหม่กว่า (แนะนำ v20+)
- **NPM**: เวอร์ชัน 9.0.0 ขึ้นไป

### 1. โคลน Repository
`ash
git clone https://github.com/forQodeding/moodwall.git
cd moodwall
`

### 2. ติดตั้ง Dependencies
`ash
npm install
`

### 3. สั่งรัน Server
`ash
npm start
`
*(หรือใช้ 
ode server.js / โหมด Dev: 
pm run dev)*

### 4. เปิดเข้าใช้งานผ่านเบราว์เซอร์
- 🌐 **หน้าบ้าน (Main Wall):** [http://localhost:3000](http://localhost:3000)
- 🛡️ **หลังบ้าน (Admin Studio):** [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

---

## 🔐 การเข้าใช้งานระบบหลังบ้าน (Admin Studio)

1. เปิดเบราว์เซอร์ไปที่ [http://localhost:3000/admin.html](http://localhost:3000/admin.html)
2. กรอกรหัสผ่านผู้ดูแลระบบ:
   - **รหัสผ่านเริ่มต้น (Default Password):** dmin1234
3. เข้าสู่แดชบอร์ดเพื่อดูสถิติ, แก้ไขโพสต์แบบเรียลไทม์ หรือจัดการเนื้อหาได้ทันที

---

## 📡 RESTful API Endpoints

| Method | Endpoint | Description | Request Body |
|:---|:---|:---|:---|
| GET | /api/posts | ดึงรายการโพสต์ทั้งหมด (เรียงจากใหม่สุด) | - |
| POST | /api/posts | สร้างโพสต์ใหม่ | {"content": "...", "mood": "happy"} |
| PUT | /api/posts/:id | แก้ไขข้อมูลโพสต์ | {"content": "...", "mood": "happy", "likes": 10} |
| POST | /api/posts/:id/like | กดถูกใจโพสต์ (+1 Like) | - |
| DELETE | /api/posts/:id | ลบโพสต์ออกจากระบบ | - |
| GET | /api/stats | ดึงสถิติรวมของระบบ | - |
| POST | /api/admin/reset | รีเซ็ตฐานข้อมูลเป็นค่าเริ่มต้น | - |

---

## ⚡ WebSocket Realtime Protocol

เมื่อ Client เชื่อมต่อมาที่ ws://localhost:3000 Server จะทำการกระจาย (Broadcast) Event ต่างๆ ดังนี้:

- INSERT — มีโพสต์ใหม่ถูกสร้างขึ้น
- UPDATE — มีการแก้ไขข้อความหรือหมวดอารมณ์ของโพสต์
- LIKE — มีการกดไลก์และจำนวนไลก์เพิ่มขึ้น
- DELETE — มีโพสต์ถูกลบออกจากระบบ
- RESET — มีการรีเซ็ตฐานข้อมูลกลับเป็นค่าเริ่มต้น

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

<div align="center">
  <sub>Developed with ❤️ for Realtime Web Experience & Custom Backend Architecture</sub>
</div>
