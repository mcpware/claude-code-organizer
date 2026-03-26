# Claude Code Organizer

[![npm version](https://img.shields.io/npm/v/@mcpware/claude-code-organizer)](https://www.npmjs.com/package/@mcpware/claude-code-organizer)
[![npm downloads](https://img.shields.io/npm/dt/@mcpware/claude-code-organizer?label=downloads)](https://www.npmjs.com/package/@mcpware/claude-code-organizer)
[![GitHub stars](https://img.shields.io/github/stars/mcpware/claude-code-organizer)](https://github.com/mcpware/claude-code-organizer/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/mcpware/claude-code-organizer)](https://github.com/mcpware/claude-code-organizer/network/members)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [廣東話](README.zh-HK.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | Bahasa Indonesia | [Italiano](README.it.md) | [Português](README.pt-BR.md) | [Türkçe](README.tr.md) | [Tiếng Việt](README.vi.md) | [ไทย](README.th.md)

**Rapikan semua memory, skill, MCP server, dan hook Claude Code Anda — lihat berdasarkan hierarki scope, pindahkan antar-scope lewat drag-and-drop.**

![Claude Code Organizer Demo](docs/demo.gif)

## masalahnya

Setiap kali Anda menggunakan Claude Code, dua hal terjadi secara diam-diam — dan keduanya tidak terlihat oleh Anda.

### Masalah 1: Anda tidak tahu berapa banyak context yang sudah terpakai

Ini adalah direktori project nyata setelah dua minggu penggunaan:

![Context Budget](docs/democontextbudged.png)

**Jika Anda memulai sesi Claude Code di direktori ini, 70.9K tokens sudah dimuat sebelum Anda memulai percakapan apa pun.** Itu 35.4% dari context window 200K Anda — hilang sebelum Anda mengetik satu karakter pun. Estimasi biaya hanya untuk overhead ini: $1.06 USD per sesi di Opus, $0.21 di Sonnet.

Sisa 64.5% dibagi antara pesan Anda, respons Claude, dan hasil tool sebelum context compression dimulai. Semakin penuh context, semakin tidak akurat Claude — efek yang dikenal sebagai **context rot**.

Dari mana 70.9K berasal? Termasuk semua yang bisa kami **ukur secara offline** — CLAUDE.md, memory, skill, definisi MCP server, settings, hooks, rules, commands, dan agents — di-tokenisasi per item. Ditambah **estimasi system overhead** (~21K tokens) untuk kerangka tetap yang Claude Code muat di setiap API call: system prompt, 23+ definisi tool bawaan, dan MCP tool schemas.

Dan itu hanya yang bisa dihitung. Tidak **termasuk** **runtime injections** — token yang Claude Code tambahkan secara diam-diam selama sesi:

- **Rule re-injection** — semua file rule Anda diinjeksi ulang ke context setelah setiap tool call. Setelah ~30 tool call, ini saja bisa menghabiskan ~46% context window Anda
- **File change diffs** — ketika file yang Anda baca atau tulis dimodifikasi secara eksternal (misal oleh linter), seluruh diff diinjeksi sebagai system-reminder tersembunyi
- **System reminders** — peringatan malware, pengingat token, dan injeksi tersembunyi lainnya yang dilampirkan ke pesan
- **Conversation history** — pesan Anda, respons Claude, dan semua hasil tool dikirim ulang di setiap API call

Penggunaan aktual Anda di tengah sesi jauh lebih tinggi dari 70.9K. Anda hanya tidak bisa melihatnya.

### Masalah 2: Context Anda tercemar

Claude Code diam-diam membuat memory, skill, config MCP, commands, agents, dan rules setiap kali Anda bekerja — dan menaruhnya ke scope yang cocok dengan direktori aktif. Preferensi yang seharusnya berlaku di mana-mana? Terkunci di satu project. Skill deploy yang hanya untuk satu repo? Bocor ke global, mencemari setiap project lain.

Skill Python pipeline yang duduk di global ikut dimuat ke sesi frontend React Anda. Entri MCP duplikat menginisialisasi server yang sama dua kali. Memory usang dari dua minggu lalu bertentangan dengan instruksi terbaru Anda. Setiap item yang salah scope membuang token **dan** menurunkan akurasi.

Anda tidak punya cara untuk melihat gambaran lengkap. Tidak ada command yang menampilkan semua item di semua scope, semua inheritance, sekaligus.

### solusinya: dashboard visual

```bash
npx @mcpware/claude-code-organizer
```

Cukup satu command. Semua yang disimpan Claude langsung terlihat — tersusun menurut hierarki scope. **Lihat budget token Anda sebelum mulai.** Pindahkan item antar-scope dengan drag-and-drop. Hapus stale memory. Temukan duplikat. Kendalikan apa yang benar-benar memengaruhi perilaku Claude.

> **Saat pertama kali dijalankan, `/cco` skill terinstal otomatis** — setelah itu, cukup ketik `/cco` di sesi Claude Code mana pun untuk membuka dashboard.

### Contoh: Temukan apa yang menghabiskan token Anda

Buka dashboard, klik **Context Budget**, beralih ke **By Tokens** — konsumen terbesar ada di atas. CLAUDE.md berukuran 2.4K token yang Anda lupakan? Skill yang terduplikasi di tiga scope? Sekarang terlihat. Bersihkan, hemat 10-20% context window.

### Contoh: Perbaiki pencemaran scope

Anda memberitahu Claude "I prefer TypeScript + ESM" saat berada di sebuah project, tapi preferensi itu berlaku di mana-mana. Drag memory tersebut dari Project ke Global. **Selesai. Sekali drag.** Skill deploy di global yang sebenarnya hanya untuk satu repo? Drag ke scope Project itu — project lain tidak akan melihatnya lagi.

### Contoh: Hapus memory usang

Claude membuat memory otomatis dari hal yang Anda ucapkan sambil lalu, atau dari yang *menurutnya* perlu diingat. Seminggu kemudian sudah tidak relevan tapi tetap dimuat di setiap sesi. Jelajahi, baca, hapus. **Anda yang menentukan apa yang Claude anggap ia ketahui tentang Anda.**

---

## fitur

- **Hierarki berbasis scope** — Semua item terlihat dalam susunan Global > Workspace > Project, lengkap dengan indikator inheritance
- **Drag-and-drop** — Pindahkan memory antar-scope, skill antara Global dan per-repo, MCP server antar-config
- **Konfirmasi perpindahan** — Setiap perpindahan selalu memunculkan modal konfirmasi sebelum file apa pun disentuh
- **Pembatasan berdasarkan tipe** — Memory hanya bisa dipindahkan ke folder Memory, skill ke folder skill, dan MCP ke config MCP
- **Search & filter** — Cari item seketika di seluruh daftar, lalu filter berdasarkan kategori (Memory, Skills, MCP, Config, Hooks, Plugins, Plans)
- **Context Budget** — Lihat persis berapa token yang dikonsumsi config Anda sebelum mengetik apa pun — rincian per item, biaya scope yang diwarisi, estimasi system overhead, dan % dari 200K context yang terpakai
- **Detail panel** — Klik item mana pun untuk melihat metadata lengkap, deskripsi, file path, dan membukanya di VS Code
- **Scan penuh per-project** — Setiap scope menampilkan semua jenis item: memory, skill, MCP server, config, hook, dan plan
- **Perpindahan file sungguhan** — File benar-benar dipindahkan di `~/.claude/`, bukan sekadar viewer
- **100+ E2E tests** — Test suite Playwright yang mencakup verifikasi filesystem, keamanan (path traversal, input malformed), context budget, dan semua 11 kategori

## mulai cepat

### opsi 1: npx (tanpa install)

```bash
npx @mcpware/claude-code-organizer
```

### opsi 2: install global

```bash
npm install -g @mcpware/claude-code-organizer
claude-code-organizer
```

### opsi 3: minta Claude

Tempelkan ini ke Claude Code:

> Jalankan `npx @mcpware/claude-code-organizer` — ini dashboard untuk mengelola pengaturan Claude Code. Beri tahu saya URL-nya saat sudah siap.

Dashboard akan terbuka di `http://localhost:3847`. Aplikasi ini bekerja langsung dengan direktori `~/.claude/` Anda yang sebenarnya.

## yang dikelola

| Tipe | Lihat | Pindah | Di-scan di | Kenapa dikunci? |
|------|:----:|:----:|:----------:|-------------|
| Memories (feedback, user, project, reference) | Ya | Ya | Global + Project | — |
| Skills | Ya | Ya | Global + Project | — |
| MCP Servers | Ya | Ya | Global + Project | — |
| Config (CLAUDE.md, settings.json) | Ya | Dikunci | Global + Project | System settings — perpindahan bisa merusak config |
| Hooks | Ya | Dikunci | Global + Project | Bergantung pada context settings — jika dipindah bisa gagal diam-diam |
| Plans | Ya | Ya | Global + Project | — |
| Plugins | Ya | Dikunci | Global only | Cache yang dikelola Claude Code |

## hierarki scope

```
Global                       <- applies everywhere
  Company (workspace)        <- applies to all sub-projects
    CompanyRepo1             <- project-specific
    CompanyRepo2             <- project-specific
  SideProjects (project)     <- independent project
  Documents (project)        <- independent project
```

Scope turunan mewarisi memory, skill, dan MCP server dari parent scope.

## cara kerjanya

1. **Memindai** `~/.claude/` — menemukan semua project, memory, skill, MCP server, hook, plugin, dan plan
2. **Menentukan hierarki scope** — memetakan relasi parent-child dari path filesystem
3. **Merender dashboard** — header scope > bar kategori > baris item, dengan indentasi yang tepat
4. **Menangani perpindahan** — saat Anda drag item atau mengklik "Move to...", file di disk benar-benar dipindahkan dengan safety check

## perbandingan

Kami meninjau semua tool config Claude Code yang bisa kami temukan. Tidak ada satu pun yang menawarkan hierarki scope visual plus perpindahan lintas-scope via drag-and-drop dalam dashboard standalone.

| Yang saya butuhkan | Desktop app (600+⭐) | VS Code extension | Full-stack web app | **Claude Code Organizer** |
|---------|:---:|:---:|:---:|:---:|
| Tree hierarki scope | No | Yes | Partial | **Yes** |
| Perpindahan drag-and-drop | No | No | No | **Yes** |
| Perpindahan lintas-scope | No | One-click | No | **Yes** |
| Hapus item usang | No | No | No | **Yes** |
| Context budget (token breakdown) | No | No | No | **Yes** |
| Tool MCP | No | No | Yes | **Yes** |
| Zero dependencies | No (Tauri) | No (VS Code) | No (React+Rust+SQLite) | **Yes** |
| Standalone (tanpa IDE) | Yes | No | Yes | **Yes** |

## dukungan platform

| Platform | Status |
|----------|:------:|
| Ubuntu / Linux | Didukung |
| macOS (Intel + Apple Silicon) | Didukung (sudah diuji komunitas di Sequoia M3) |
| Windows | Belum |
| WSL | Seharusnya bisa jalan (belum diuji) |

## struktur project

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

Frontend dan backend dipisahkan sepenuhnya. Anda bisa mengubah tampilan lewat file di `src/ui/` tanpa menyentuh logic apa pun.

## API

Dashboard ini berjalan di atas REST API:

| Endpoint | Method | Deskripsi |
|----------|--------|-------------|
| `/api/scan` | GET | Scan semua kustomisasi, lalu mengembalikan scope + item + count |
| `/api/move` | POST | Memindahkan item ke scope lain (mendukung disambiguasi kategori/nama) |
| `/api/delete` | POST | Menghapus item secara permanen |
| `/api/restore` | POST | Memulihkan file yang sudah dihapus (untuk undo) |
| `/api/restore-mcp` | POST | Memulihkan entri MCP server yang dihapus |
| `/api/destinations` | GET | Mengambil tujuan perpindahan yang valid untuk sebuah item |
| `/api/file-content` | GET | Membaca isi file untuk detail panel |

## lisensi

MIT

## proyek lain dari @mcpware

| Project | Apa fungsinya | Install |
|---------|---|---|
| **[Instagram MCP](https://github.com/mcpware/instagram-mcp)** | 23 tool Instagram Graph API — posts, comments, DMs, stories, analytics | `npx @mcpware/instagram-mcp` |
| **[UI Annotator](https://github.com/mcpware/ui-annotator-mcp)** | Label hover di halaman web mana pun — AI mereferensikan elemen berdasarkan nama | `npx @mcpware/ui-annotator` |
| **[Pagecast](https://github.com/mcpware/pagecast)** | Rekam sesi browser sebagai GIF atau video lewat MCP | `npx @mcpware/pagecast` |
| **[LogoLoom](https://github.com/mcpware/logoloom)** | Desain logo dengan AI → SVG → ekspor brand kit lengkap | `npx @mcpware/logoloom` |

## penulis

[ithiria894](https://github.com/ithiria894) — Membangun tool untuk ekosistem Claude Code.
