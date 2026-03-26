# Claude Code Organizer

[![npm version](https://img.shields.io/npm/v/@mcpware/claude-code-organizer)](https://www.npmjs.com/package/@mcpware/claude-code-organizer)
[![npm downloads](https://img.shields.io/npm/dt/@mcpware/claude-code-organizer?label=downloads)](https://www.npmjs.com/package/@mcpware/claude-code-organizer)
[![GitHub stars](https://img.shields.io/github/stars/mcpware/claude-code-organizer)](https://github.com/mcpware/claude-code-organizer/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/mcpware/claude-code-organizer)](https://github.com/mcpware/claude-code-organizer/network/members)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [廣東話](README.zh-HK.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Bahasa Indonesia](README.id.md) | [Italiano](README.it.md) | [Português](README.pt-BR.md) | [Türkçe](README.tr.md) | [Tiếng Việt](README.vi.md) | ไทย

**จัดระเบียบ memories, skills, MCP servers และ hooks ของ Claude Code ทั้งหมดในที่เดียว ดูตาม scope hierarchy และย้ายข้าม scope ด้วย drag-and-drop**

![Claude Code Organizer Demo](docs/demo.gif)

## ปัญหา

ทุกครั้งที่คุณใช้ Claude Code มีสองสิ่งที่เกิดขึ้นเงียบ ๆ — และทั้งสองอย่างคุณมองไม่เห็น

### ปัญหาที่ 1: คุณไม่รู้เลยว่า context ถูกใช้ไปเท่าไหร่แล้ว

นี่คือ directory ของ project จริงหลังใช้งานสองสัปดาห์:

![Context Budget](docs/democontextbudged.png)

**ถ้าคุณเริ่ม session Claude Code ใน directory นี้ จะมี 70.9K tokens ถูกโหลดไปแล้วก่อนที่คุณจะเริ่มพิมพ์อะไร** นั่นคือ 35.4% ของ context window 200K ของคุณ — หายไปก่อนที่จะพิมพ์แม้แต่ตัวอักษรเดียว ค่าใช้จ่ายโดยประมาณสำหรับ overhead นี้เท่านั้น: $1.06 USD ต่อ session บน Opus, $0.21 บน Sonnet

ส่วนที่เหลือ 64.5% ต้องแบ่งกันระหว่างข้อความของคุณ, คำตอบของ Claude และผลลัพธ์ของ tool ก่อนที่ context compression จะเริ่มทำงาน ยิ่ง context เต็มมากเท่าไหร่ Claude ก็ยิ่งไม่แม่นยำ — ปรากฏการณ์ที่เรียกว่า **context rot**

70.9K มาจากไหน? รวมทุกอย่างที่เรา**วัดแบบ offline ได้** — CLAUDE.md, memories, skills, คำจำกัดความของ MCP server, settings, hooks, rules, commands และ agents — คำนวณ token ทีละรายการ บวกกับ **system overhead โดยประมาณ** (~21K tokens) สำหรับโครงสร้างคงที่ที่ Claude Code โหลดทุก API call: system prompt, 23+ tool definitions ที่มีมาในตัว และ MCP tool schemas

และนั่นเป็นแค่ส่วนที่นับได้ มัน**ไม่รวม** **runtime injections** — tokens ที่ Claude Code เพิ่มเข้ามาเงียบ ๆ ระหว่าง session:

- **Rule re-injection** — ไฟล์ rule ทั้งหมดของคุณถูกฉีดกลับเข้า context หลังทุก tool call หลังจาก ~30 tool calls แค่อันนี้อย่างเดียวก็กิน ~46% ของ context window ได้
- **File change diffs** — เมื่อไฟล์ที่คุณอ่านหรือเขียนถูกแก้ไขจากภายนอก (เช่น โดย linter) diff ทั้งหมดจะถูกฉีดเข้ามาเป็น system-reminder ที่ซ่อนอยู่
- **System reminders** — คำเตือน malware, การเตือน token และ injections ที่ซ่อนอยู่อื่น ๆ จะถูกแนบไปกับข้อความ
- **Conversation history** — ข้อความของคุณ, คำตอบของ Claude และผลลัพธ์ของ tool ทั้งหมดถูกส่งซ้ำทุก API call

การใช้งานจริงระหว่าง session ของคุณสูงกว่า 70.9K อย่างมาก คุณแค่มองไม่เห็น

### ปัญหาที่ 2: Context ของคุณถูกปนเปื้อน

Claude Code สร้าง memories, skills, MCP configs, commands, agents และ rules แบบเงียบ ๆ ทุกครั้งที่คุณทำงาน แล้วโยนลง scope ที่ตรงกับ directory ปัจจุบัน สิ่งที่คุณอยากให้มีผลทุกที่? ติดอยู่ใน project เดียว deploy skill ที่ควรอยู่กับ repo เดียว? หลุดไปอยู่ใน global ปนเปื้อนทุก project อื่น

skill สำหรับ Python pipeline ที่อยู่ใน global ถูกโหลดเข้า session React frontend ของคุณ MCP entry ที่ซ้ำกันทำให้ server เดิมถูก initialize สองครั้ง memory เก่าจากสองสัปดาห์ก่อนขัดกับคำสั่งปัจจุบัน ทุก item ที่อยู่ผิด scope เปลือง token **และ**ลดความแม่นยำ

คุณไม่มีทางเห็นภาพรวมทั้งหมด ไม่มีคำสั่งไหนที่แสดงทุก item ครบทุก scope ทุกชั้นการสืบทอด ได้ในทีเดียว

### ทางออก: dashboard ที่เห็นภาพรวม

```bash
npx @mcpware/claude-code-organizer
```

สั่งครั้งเดียว เห็นทุกอย่างที่ Claude เก็บไว้ จัดเรียงตาม scope hierarchy **เห็น token budget ก่อนเริ่มทำงาน** ลาก item ข้าม scope ลบ memory เก่า หา item ซ้ำ ควบคุมได้จริงว่าอะไรมีผลต่อพฤติกรรมของ Claude

> **รันครั้งแรกจะติดตั้ง `/cco` skill ให้อัตโนมัติ** — หลังจากนั้นแค่พิมพ์ `/cco` ใน session Claude Code ไหนก็ได้เพื่อเปิด dashboard

### ตัวอย่าง: หาว่าอะไรกำลังกิน token ของคุณ

เปิด dashboard คลิก **Context Budget** สลับไปที่ **By Tokens** — ตัวกิน token ใหญ่สุดอยู่ด้านบน CLAUDE.md ขนาด 2.4K token ที่คุณลืมไป? skill ที่ซ้ำกันในสาม scope? ตอนนี้เห็นแล้ว ทำความสะอาด ประหยัด context window ได้ 10-20%

### ตัวอย่าง: แก้ไขการปนเปื้อนของ scope

คุณบอก Claude ว่า "I prefer TypeScript + ESM" ตอนอยู่ใน project แต่ preference นี้ควรมีผลทุกที่ ลาก memory นั้นจาก Project ไป Global **ลากครั้งเดียวจบ** deploy skill ที่อยู่ใน global แต่จริง ๆ ใช้กับ repo เดียว? ลากไปไว้ใน Project scope นั้น — project อื่นจะไม่เห็นมันอีก

### ตัวอย่าง: ลบ memory ที่ไม่อัปเดตแล้ว

Claude อาจสร้าง memory อัตโนมัติจากสิ่งที่คุณพูดเล่น ๆ หรือจากสิ่งที่มัน*คิดว่า*ควรจำไว้ ผ่านไปสัปดาห์หนึ่งอาจไม่เกี่ยวแล้ว แต่ยังถูกโหลดทุก session เปิดดู อ่าน ลบ **คุณเป็นคนกำหนดว่า Claude ควรรู้อะไรเกี่ยวกับคุณ**

---

## ฟีเจอร์

- **เห็นตาม scope hierarchy** — item ทั้งหมดถูกจัดเป็น Global > Workspace > Project พร้อมตัวบอกการสืบทอด
- **Drag-and-drop** — ย้าย memories ข้าม scope, ย้าย skills ระหว่าง Global กับ per-repo, ย้าย MCP servers ข้าม config
- **ยืนยันก่อนย้าย** — ทุกครั้งที่ย้าย จะมี modal ให้ยืนยันก่อนแตะไฟล์จริง
- **กันย้ายผิดประเภท** — items แต่ละประเภทย้ายได้เฉพาะปลายทางของประเภทตัวเอง: memories ไป folder ของ Memory, skills ไป folder ของ Skills, MCP ไป MCP config
- **Search & filter** — ค้นหาทุก item ได้ทันที และกรองตามหมวดหมู่ (Memory, Skills, MCP, Config, Hooks, Plugins, Plans)
- **Context Budget** — ดูได้เลยว่า config ของคุณกิน token ไปเท่าไหร่ก่อนพิมพ์อะไร — แยกรายละเอียดทีละ item, ค่าใช้จ่าย scope ที่สืบทอด, ประมาณการ system overhead และ % ของ 200K context ที่ใช้ไป
- **detail panel** — คลิก item ไหนก็ได้เพื่อดู metadata แบบเต็ม, description, file path และเปิดใน VS Code
- **สแกนครบทุก Project** — ทุก scope จะแสดง item ทุกประเภท: memories, skills, MCP servers, configs, hooks และ plans
- **ย้ายไฟล์จริง** — ย้ายไฟล์ใน `~/.claude/` จริง ไม่ใช่แค่ viewer
- **100+ E2E tests** — ชุดทดสอบ Playwright ที่ครอบคลุมการตรวจ filesystem, ความปลอดภัย (path traversal, input ที่ผิดรูปแบบ), context budget และทั้ง 11 หมวดหมู่

## เริ่มต้นใช้งาน

### วิธีที่ 1: ใช้ npx (ไม่ต้อง install)

```bash
npx @mcpware/claude-code-organizer
```

### วิธีที่ 2: ติดตั้งแบบ global

```bash
npm install -g @mcpware/claude-code-organizer
claude-code-organizer
```

### วิธีที่ 3: ให้ Claude รันให้

วางข้อความนี้ใน Claude Code:

> Run `npx @mcpware/claude-code-organizer` — it's a dashboard for managing Claude Code settings. Tell me the URL when it's ready.

เมื่อรันแล้ว dashboard จะเปิดที่ `http://localhost:3847` และทำงานกับ `~/.claude/` จริงของคุณ

## สิ่งที่จัดการได้

| ประเภท | ดูได้ | ย้ายได้ | สแกนที่ | ทำไมถึงล็อก? |
|------|:----:|:----:|:----------:|-------------|
| Memories (feedback, user, project, reference) | ได้ | ได้ | Global + Project | — |
| Skills | ได้ | ได้ | Global + Project | — |
| MCP Servers | ได้ | ได้ | Global + Project | — |
| Config (CLAUDE.md, settings.json) | ได้ | ล็อก | Global + Project | เป็น system settings ถ้าย้ายอาจทำให้ config พัง |
| Hooks | ได้ | ล็อก | Global + Project | ผูกกับ settings context ถ้าย้ายผิดที่อาจ fail แบบเงียบ ๆ |
| Plans | ได้ | ได้ | Global + Project | — |
| Plugins | ได้ | ล็อก | Global only | cache ที่ Claude Code จัดการเอง |

## ลำดับชั้นของ scope

```
Global                       <- applies everywhere
  Company (workspace)        <- applies to all sub-projects
    CompanyRepo1             <- project-specific
    CompanyRepo2             <- project-specific
  SideProjects (project)     <- independent project
  Documents (project)        <- independent project
```

scope ลูกจะได้รับ memories, skills และ MCP servers จาก scope แม่โดยอัตโนมัติ

## วิธีการทำงาน

1. **สแกน** `~/.claude/` — ค้นหา projects, memories, skills, MCP servers, hooks, plugins และ plans ทั้งหมด
2. **ระบุ scope hierarchy** — ระบุความสัมพันธ์แบบ parent-child จาก filesystem paths
3. **เรนเดอร์ dashboard** — แสดง scope headers > category bars > item rows พร้อมระยะย่อหน้าให้ถูกต้อง
4. **จัดการการย้าย** — เมื่อคุณลากหรือคลิก "Move to..." ระบบจะย้ายไฟล์บน disk จริงพร้อม safety checks

## เปรียบเทียบ

เราไล่ดูเครื่องมือจัดการ config ของ Claude Code เท่าที่หาเจอ ยังไม่พบตัวไหนที่มีทั้ง scope hierarchy แบบมองเห็นภาพ และการย้ายข้าม scope ด้วย drag-and-drop ใน dashboard แบบ standalone

| สิ่งที่ต้องการ | Desktop app (600+⭐) | VS Code extension | Full-stack web app | **Claude Code Organizer** |
|---------|:---:|:---:|:---:|:---:|
| มี tree ของ scope hierarchy | ไม่มี | มี | บางส่วน | **มี** |
| ย้ายด้วย drag-and-drop | ไม่มี | ไม่มี | ไม่มี | **มี** |
| ย้ายข้าม scope | ไม่มี | คลิกครั้งเดียว | ไม่มี | **มี** |
| ลบ item ที่ไม่อัปเดตแล้ว | ไม่มี | ไม่มี | ไม่มี | **มี** |
| Context budget (token breakdown) | ไม่มี | ไม่มี | ไม่มี | **มี** |
| เครื่องมือ MCP | ไม่มี | ไม่มี | มี | **มี** |
| ไม่มี dependencies เพิ่ม | ไม่มี (Tauri) | ไม่มี (VS Code) | ไม่มี (React+Rust+SQLite) | **มี** |
| ใช้งาน standalone (ไม่ต้องมี IDE) | มี | ไม่มี | มี | **มี** |

## การรองรับแพลตฟอร์ม

| Platform | สถานะ |
|----------|:------:|
| Ubuntu / Linux | รองรับ |
| macOS (Intel + Apple Silicon) | รองรับ (มีคนใน community ทดสอบบน Sequoia M3 แล้ว) |
| Windows | ยังไม่รองรับ |
| WSL | น่าจะใช้ได้ (ยังไม่ทดสอบ) |

## โครงสร้าง project

```
src/
  scanner.mjs       # Scans ~/.claude/ — pure data, no side effects
  mover.mjs         # Moves files between scopes — safety checks + rollback
  server.mjs        # HTTP server — routes only, no logic
  ui/
    index.html       # HTML structure
    style.css        # All styling (edit freely, won't break logic)
    app.js           # Frontend rendering + SortableJS + interactions
bin/
  cli.mjs            # Entry point
```

Frontend กับ backend แยกจากกันชัดเจน ถ้าอยากปรับหน้าตา ให้แก้ไฟล์ใน `src/ui/` ได้เลยโดยไม่ต้องแตะ logic

## API

dashboard ตัวนี้มี REST API รองรับอยู่ด้านหลัง:

| Endpoint | Method | คำอธิบาย |
|----------|--------|-------------|
| `/api/scan` | GET | สแกน customizations ทั้งหมด แล้วคืน scopes + items + counts |
| `/api/move` | POST | ย้าย item ไปยัง scope อื่น (รองรับการแยกกรณี category/name ซ้ำกัน) |
| `/api/delete` | POST | ลบ item ถาวร |
| `/api/restore` | POST | กู้คืนไฟล์ที่ลบไป (ใช้สำหรับ undo) |
| `/api/restore-mcp` | POST | กู้คืน MCP server entry ที่ลบไป |
| `/api/destinations` | GET | ดึงปลายทางที่ย้ายไปได้สำหรับ item |
| `/api/file-content` | GET | อ่านเนื้อหาไฟล์เพื่อใช้ใน detail panel |

## สัญญาอนุญาต

MIT

## โปรเจกต์อื่นจาก @mcpware

| Project | ทำอะไร | Install |
|---------|---|---|
| **[Instagram MCP](https://github.com/mcpware/instagram-mcp)** | เครื่องมือ Instagram Graph API 23 ตัว — posts, comments, DMs, stories, analytics | `npx @mcpware/instagram-mcp` |
| **[UI Annotator](https://github.com/mcpware/ui-annotator-mcp)** | แสดงป้ายชื่อเวลา hover บนเว็บเพจใดก็ได้ — ให้ AI อ้างอิง element ตามชื่อ | `npx @mcpware/ui-annotator` |
| **[Pagecast](https://github.com/mcpware/pagecast)** | บันทึก browser sessions เป็น GIF หรือวิดีโอผ่าน MCP | `npx @mcpware/pagecast` |
| **[LogoLoom](https://github.com/mcpware/logoloom)** | ออกแบบโลโก้ด้วย AI → SVG → export brand kit ได้ครบชุด | `npx @mcpware/logoloom` |

## ผู้เขียน

[ithiria894](https://github.com/ithiria894) — พัฒนาเครื่องมือสำหรับ ecosystem ของ Claude Code.
