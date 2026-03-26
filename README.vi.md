# Claude Code Organizer

[![npm version](https://img.shields.io/npm/v/@mcpware/claude-code-organizer)](https://www.npmjs.com/package/@mcpware/claude-code-organizer)
[![npm downloads](https://img.shields.io/npm/dt/@mcpware/claude-code-organizer?label=downloads)](https://www.npmjs.com/package/@mcpware/claude-code-organizer)
[![GitHub stars](https://img.shields.io/github/stars/mcpware/claude-code-organizer)](https://github.com/mcpware/claude-code-organizer/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/mcpware/claude-code-organizer)](https://github.com/mcpware/claude-code-organizer/network/members)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [廣東話](README.zh-HK.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Bahasa Indonesia](README.id.md) | [Italiano](README.it.md) | [Português](README.pt-BR.md) | [Türkçe](README.tr.md) | Tiếng Việt | [ไทย](README.th.md)

**Sắp xếp toàn bộ memory, skill, MCP server và hook của Claude Code; xem theo cây scope, di chuyển giữa các scope bằng drag-and-drop.**

![Claude Code Organizer Demo](docs/demo.gif)

## vấn đề

Mỗi khi bạn sử dụng Claude Code, hai điều âm thầm xảy ra — và cả hai đều không hiển thị với bạn.

### Vấn đề 1: Bạn không biết context đã dùng bao nhiêu rồi

Đây là thư mục project thực sau hai tuần sử dụng:

![Context Budget](docs/democontextbudged.png)

**Nếu bạn mở một session Claude Code trong thư mục này, 70.9K tokens đã được nạp trước khi bạn bắt đầu cuộc trò chuyện nào.** Đó là 35.4% context window 200K của bạn — biến mất trước khi bạn gõ một ký tự nào. Chi phí ước tính chỉ riêng overhead này: $1.06 USD mỗi session trên Opus, $0.21 trên Sonnet.

64.5% còn lại được chia sẻ giữa tin nhắn của bạn, phản hồi của Claude và kết quả tool trước khi context compression bắt đầu. Context càng đầy, Claude càng kém chính xác — hiệu ứng gọi là **context rot**.

70.9K đến từ đâu? Bao gồm mọi thứ chúng tôi có thể **đo offline** — CLAUDE.md, memory, skill, định nghĩa MCP server, settings, hooks, rules, commands và agents — được tokenize theo từng item. Cộng thêm **system overhead ước tính** (~21K tokens) cho khung cố định mà Claude Code nạp mỗi API call: system prompt, 23+ định nghĩa tool tích hợp và MCP tool schemas.

Và đó mới chỉ là phần đếm được. Nó **không bao gồm** **runtime injections** — tokens mà Claude Code âm thầm thêm vào trong session:

- **Rule re-injection** — tất cả file rule của bạn được tiêm lại vào context sau mỗi tool call. Sau ~30 tool calls, riêng điều này có thể ngốn ~46% context window
- **File change diffs** — khi file bạn đã đọc hoặc viết bị sửa bên ngoài (ví dụ bởi linter), toàn bộ diff được tiêm vào dưới dạng system-reminder ẩn
- **System reminders** — cảnh báo malware, nhắc nhở token và các injection ẩn khác được đính kèm vào tin nhắn
- **Conversation history** — tin nhắn của bạn, phản hồi của Claude và tất cả kết quả tool được gửi lại mỗi API call

Mức sử dụng thực tế giữa session của bạn cao hơn 70.9K đáng kể. Bạn chỉ không nhìn thấy.

### Vấn đề 2: Context của bạn bị nhiễm

Claude Code âm thầm tạo memory, skill, config MCP, commands, agents và rules mỗi khi bạn làm việc — rồi đẩy vào scope nào khớp với thư mục hiện tại. Preference muốn áp dụng mọi nơi? Bị kẹt trong một project. Skill deploy chỉ cho một repo? Rò rỉ vào global, làm nhiễm mọi project khác.

Skill Python pipeline nằm ở global bị nạp vào session React frontend. MCP entry trùng khởi tạo cùng server hai lần. Memory cũ từ hai tuần trước mâu thuẫn với chỉ dẫn hiện tại. Mỗi item sai scope đều tốn token **và** giảm độ chính xác.

Bạn không có cách nào thấy bức tranh toàn cảnh. Không có lệnh nào hiển thị tất cả item ở mọi scope, mọi kế thừa, cùng một lúc.

### cách giải quyết: dashboard trực quan

```bash
npx @mcpware/claude-code-organizer
```

Một lệnh duy nhất. Thấy mọi thứ Claude đã lưu — sắp xếp theo cây scope. **Xem token budget trước khi bắt đầu.** Kéo item giữa các scope. Xóa memory cũ. Tìm item trùng. Kiểm soát những gì thực sự ảnh hưởng đến hành vi của Claude.

> **Lần chạy đầu tiên tự động cài `/cco` skill** — sau đó chỉ cần gõ `/cco` trong bất kỳ session Claude Code nào để mở dashboard.

### Ví dụ: Tìm thứ đang ngốn token của bạn

Mở dashboard, bấm **Context Budget**, chuyển sang **By Tokens** — kẻ tiêu thụ lớn nhất ở trên cùng. CLAUDE.md 2.4K token mà bạn quên? Skill trùng ở ba scope? Giờ bạn thấy rồi. Dọn dẹp, tiết kiệm 10-20% context window.

### Ví dụ: Sửa nhiễm scope

Bạn nói với Claude "I prefer TypeScript + ESM" khi đang trong một project, nhưng preference đó áp dụng mọi nơi. Kéo memory đó từ Project sang Global. **Xong. Một cú kéo.** Skill deploy ở global nhưng chỉ có ý nghĩa với một repo? Kéo vào scope Project đó — project khác sẽ không thấy nữa.

### Ví dụ: Xóa memory cũ

Claude tự tạo memory từ những câu bạn nói vu vơ, hoặc từ những gì nó *nghĩ* là nên nhớ. Một tuần sau không còn liên quan nhưng vẫn bị nạp mọi session. Duyệt, đọc, xóa. **Bạn quyết định Claude nên "biết" gì về mình.**

---

## tính năng

- **Nhìn theo cây scope**: Thấy toàn bộ item được sắp theo Global > Workspace > Project, kèm dấu hiệu kế thừa
- **Drag-and-drop**: Di chuyển memory giữa các scope, skill giữa Global và từng repo, MCP server giữa các config
- **Xác nhận trước khi di chuyển**: Mỗi lần move đều hiện modal xác nhận trước khi đụng vào file
- **An toàn theo từng loại item**: Memory chỉ có thể move vào thư mục memory, skill vào thư mục skill, MCP vào config MCP
- **Tìm kiếm và lọc**: Tìm tức thì trên toàn bộ item, lọc theo nhóm (Memory, Skills, MCP, Config, Hooks, Plugins, Plans)
- **Context Budget**: Xem chính xác config của bạn ngốn bao nhiêu token trước khi gõ bất cứ gì — chi tiết từng item, chi phí scope kế thừa, ước tính system overhead và % của 200K context đã dùng
- **Panel chi tiết**: Bấm vào bất kỳ item nào để xem đầy đủ metadata, mô tả, file path và mở trong VS Code
- **Quét đầy đủ theo từng project**: Mỗi scope đều hiển thị đủ mọi loại item: memory, skill, MCP server, config, hook và plan
- **Di chuyển file thật**: Tool thực sự move file trong `~/.claude/`, không phải chỉ để xem
- **100+ bài test E2E**: Bộ test Playwright bao gồm xác minh filesystem, bảo mật (path traversal, input sai format), context budget và toàn bộ 11 category

## bắt đầu nhanh

### tùy chọn 1: npx (không cần cài đặt)

```bash
npx @mcpware/claude-code-organizer
```

### tùy chọn 2: cài đặt global

```bash
npm install -g @mcpware/claude-code-organizer
claude-code-organizer
```

### tùy chọn 3: nhờ Claude

Dán đoạn này vào Claude Code:

> Chạy `npx @mcpware/claude-code-organizer` — đây là một dashboard để quản lý thiết lập của Claude Code. Khi sẵn sàng thì báo cho tôi URL.

Dashboard sẽ mở tại `http://localhost:3847`. Dùng trực tiếp với thư mục `~/.claude/` thật của bạn.

## công cụ này quản lý gì

| Loại | Xem | Di chuyển | Quét tại | Tại sao bị khóa? |
|------|:----:|:----:|:----------:|-------------|
| Memories (feedback, user, project, reference) | Có | Có | Global + Project | - |
| Skills | Có | Có | Global + Project | - |
| MCP Servers | Có | Có | Global + Project | - |
| Config (CLAUDE.md, settings.json) | Có | Khóa | Global + Project | Thiết lập hệ thống, move nhầm có thể làm hỏng config |
| Hooks | Có | Khóa | Global + Project | Phụ thuộc vào context của settings, move sang chỗ khác có thể lỗi âm thầm |
| Plans | Có | Có | Global + Project | - |
| Plugins | Có | Khóa | Chỉ Global | Cache do Claude Code quản lý |

## cây scope

```bash
Global                       <- applies everywhere
  Company (workspace)        <- applies to all sub-projects
    CompanyRepo1             <- project-specific
    CompanyRepo2             <- project-specific
  SideProjects (project)     <- independent project
  Documents (project)        <- independent project
```

Scope con sẽ kế thừa memory, skill và MCP server từ scope cha.

## cách hoạt động

1. **Quét** `~/.claude/` — phát hiện toàn bộ project, memory, skill, MCP server, hook, plugin và plan
2. **Xác định cây scope** — suy ra quan hệ cha-con từ các path trong filesystem
3. **Render dashboard** — header scope > thanh category > từng dòng item, với độ thụt đúng
4. **Xử lý thao tác move** — khi bạn kéo hoặc bấm "Move to...", tool sẽ thực sự move file trên đĩa kèm các kiểm tra an toàn

## so sánh

Chúng tôi đã xem qua mọi tool cấu hình Claude Code mà tìm được. Không có tool nào vừa cho cây scope trực quan vừa hỗ trợ drag-and-drop giữa các scope trong một dashboard chạy độc lập.

| Điều tôi cần | Desktop app (600+⭐) | VS Code extension | Full-stack web app | **Claude Code Organizer** |
|---------|:---:|:---:|:---:|:---:|
| Cây scope | Không | Có | Một phần | **Có** |
| Move bằng drag-and-drop | Không | Không | Không | **Có** |
| Move giữa các scope | Không | One-click | Không | **Có** |
| Xóa item cũ | Không | Không | Không | **Có** |
| Context budget (token breakdown) | Không | Không | Không | **Có** |
| Tool MCP | Không | Không | Có | **Có** |
| Zero dependencies | Không (Tauri) | Không (VS Code) | Không (React+Rust+SQLite) | **Có** |
| Chạy độc lập (không cần IDE) | Có | Không | Có | **Có** |

## hỗ trợ nền tảng

| Nền tảng | Trạng thái |
|----------|:------:|
| Ubuntu / Linux | Được hỗ trợ |
| macOS (Intel + Apple Silicon) | Được hỗ trợ (community-tested trên Sequoia M3) |
| Windows | Chưa hỗ trợ |
| WSL | Có thể chạy được (chưa test) |

## cấu trúc project

```bash
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

Frontend và backend tách riêng hoàn toàn. Bạn có thể sửa các file trong `src/ui/` để đổi giao diện mà không phải chạm vào logic.

## API

Phía sau dashboard là một REST API:

| Endpoint | Method | Mô tả |
|----------|--------|-------------|
| `/api/scan` | GET | Quét toàn bộ tùy chỉnh, trả về scopes + items + counts |
| `/api/move` | POST | Move một item sang scope khác (hỗ trợ phân biệt theo category/name) |
| `/api/delete` | POST | Xóa vĩnh viễn một item |
| `/api/restore` | POST | Khôi phục file đã xóa (để undo) |
| `/api/restore-mcp` | POST | Khôi phục một MCP server entry đã xóa |
| `/api/destinations` | GET | Lấy danh sách đích move hợp lệ cho một item |
| `/api/file-content` | GET | Đọc nội dung file cho panel chi tiết |

## giấy phép

MIT

## thêm từ @mcpware

| Dự án | Chức năng | Cài đặt |
|---------|---|---|
| **[Instagram MCP](https://github.com/mcpware/instagram-mcp)** | 23 tool Instagram Graph API — bài đăng, bình luận, DM, story, analytics | `npx @mcpware/instagram-mcp` |
| **[UI Annotator](https://github.com/mcpware/ui-annotator-mcp)** | Gắn nhãn hover trên mọi trang web để AI gọi phần tử theo tên | `npx @mcpware/ui-annotator` |
| **[Pagecast](https://github.com/mcpware/pagecast)** | Ghi lại phiên duyệt web thành GIF hoặc video qua MCP | `npx @mcpware/pagecast` |
| **[LogoLoom](https://github.com/mcpware/logoloom)** | Thiết kế logo bằng AI → SVG → xuất trọn bộ nhận diện thương hiệu | `npx @mcpware/logoloom` |

## tác giả

[ithiria894](https://github.com/ithiria894) - Xây công cụ cho hệ sinh thái Claude Code.
