# Claude Code Organizer

[![npm version](https://img.shields.io/npm/v/@mcpware/claude-code-organizer)](https://www.npmjs.com/package/@mcpware/claude-code-organizer)
[![npm downloads](https://img.shields.io/npm/dt/@mcpware/claude-code-organizer?label=downloads)](https://www.npmjs.com/package/@mcpware/claude-code-organizer)
[![GitHub stars](https://img.shields.io/github/stars/mcpware/claude-code-organizer)](https://github.com/mcpware/claude-code-organizer/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/mcpware/claude-code-organizer)](https://github.com/mcpware/claude-code-organizer/network/members)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [廣東話](README.zh-HK.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Bahasa Indonesia](README.id.md) | [Italiano](README.it.md) | [Português](README.pt-BR.md) | Türkçe | [Tiếng Việt](README.vi.md) | [ไทย](README.th.md)

**Claude Code içindeki tüm memory, skill, MCP server ve hook'larınızı düzenleyin; scope hiyerarşisine göre görün, drag-and-drop ile scope'lar arasında taşıyın.**

![Claude Code Organizer Demo](docs/demo.gif)

## Sorun

Claude Code'u her kullandığınızda, iki şey sessizce gerçekleşir — ve ikisi de size görünmez.

### Sorun 1: Context'in ne kadarının zaten kullanıldığını bilmiyorsunuz

Bu, iki haftalık kullanımdan sonra gerçek bir proje dizini:

![Context Budget](docs/democontextbudged.png)

**Bu dizinde bir Claude Code oturumu başlatırsanız, herhangi bir konuşma başlamadan önce zaten 70.9K token yüklenmiş olur.** Bu, 200K context window'unuzun %35.4'ü — tek bir karakter yazmadan yok olmuş demek. Yalnızca bu overhead için tahmini maliyet: Opus'ta oturum başına $1.06 USD, Sonnet'te $0.21 USD.

Kalan %64.5, context compression devreye girene kadar mesajlarınız, Claude'un yanıtları ve tool sonuçları arasında paylaşılır. Context ne kadar doluysa Claude o kadar az doğru çalışır — bu etki **context rot** olarak bilinir.

70.9K nereden geliyor? **Çevrimdışı ölçebildiğimiz** her şeyi içerir — CLAUDE.md'niz, memory'ler, skill'ler, MCP server tanımları, ayarlar, hook'lar, rule'lar, command'lar ve agent'lar — öğe başına tokenize edilmiş. Artı, Claude Code'un her API call'da yüklediği değişmez iskelet için **tahmini sistem overhead'i** (~21K token): system prompt, 23+ yerleşik tool tanımı ve MCP tool schema'ları.

Ve bu yalnızca sayabildiğimiz kısım. **Runtime injection'ları** — Claude Code'un oturum sırasında sessizce eklediği token'lar — **dahil değildir**:

- **Rule re-injection** — tüm rule dosyalarınız her tool call'dan sonra context'e yeniden enjekte edilir. ~30 tool call'dan sonra, yalnızca bu, context window'unuzun ~%46'sını tüketebilir
- **File change diffs** — okuduğunuz veya yazdığınız bir dosya dışarıdan değiştirildiğinde (ör. bir linter tarafından), tam diff gizli bir system-reminder olarak enjekte edilir
- **System reminders** — malware uyarıları, token hatırlatmaları ve mesajlara eklenen diğer gizli injection'lar
- **Conversation history** — mesajlarınız, Claude'un yanıtları ve tüm tool sonuçları her API call'da yeniden gönderilir

Oturum ortasındaki gerçek kullanımınız 70.9K'den önemli ölçüde yüksektir. Sadece göremiyorsunuz.

### Sorun 2: Context'iniz kirlenmiş durumda

Claude Code, siz çalışırken sessizce memory, skill, MCP config, command, agent ve rule oluşturur — ve bunları mevcut dizininize uyan scope'a bırakır. Her yerde geçerli olmasını istediğiniz bir tercih? Tek bir projede sıkışır. Tek bir repo'ya ait deploy skill'i? Global'a sızar ve diğer her projeyi kirletir.

Global'daki bir Python pipeline skill'i, React frontend oturumunuza yüklenir. Tekrarlanan MCP kayıtları aynı server'ı iki kez başlatır. İki hafta önceki eski memory'ler güncel talimatlarınızla çelişir. Yanlış scope'taki her öğe token harcar **ve** doğruluğu düşürür.

Büyük resmi görmenin yolu yok. Tüm scope'lardaki tüm öğeleri, tüm miras zincirini aynı anda gösteren bir komut yok.

### Çözüm: görsel bir dashboard

```bash
npx @mcpware/claude-code-organizer
```

Tek komut. Claude'un sakladığı her şeyi scope hiyerarşisine göre düzenlenmiş halde görün. **Başlamadan önce token bütçenizi görün.** Öğeleri scope'lar arasında sürükleyin. Eski memory'leri silin. Kopyaları bulun. Claude'un davranışını gerçekte neyin etkilediğini kontrol altına alın.

> **İlk çalıştırma otomatik olarak bir `/cco` skill yükler** — bundan sonra, herhangi bir Claude Code oturumunda `/cco` yazmanız yeterli.

### Örnek: Token'larınızı neyin yediğini bulun

Dashboard'u açın, **Context Budget**'a tıklayın, **By Tokens**'a geçin — en büyük tüketiciler en üstte. Unuttuğunuz 2.4K token'lık bir CLAUDE.md? Üç scope'ta tekrarlanan bir skill? Artık görüyorsunuz. Temizleyin, context window'un %10-20'sini kurtarın.

### Örnek: Scope kirliliğini düzeltin

Bir proje içindeyken Claude'a "I prefer TypeScript + ESM" dediniz, ama bu tercih her yerde geçerli. O memory'yi Project'ten Global'a sürükleyin. **Bitti. Tek hareket.** Global'daki bir deploy skill'i gerçekte tek bir repo için mi anlamlı? İlgili Project scope'una sürükleyin — diğer projeler artık görmez.

### Örnek: Eski memory'leri silmek

Claude bazen gündelik söylediğiniz şeylerden, bazen de *hatırlanmasını istediğinizi sandığı* ayrıntılardan otomatik memory üretir. Bir hafta sonra alakasız hale gelir ama her oturuma yüklenmeye devam eder. Göz atın, okuyun, silin. **Claude'un sizin hakkınızda ne bildiğini sandığını siz belirlersiniz.**

---

## Özellikler

- **Scope hiyerarşisi görünümü** — Tüm öğeleri Global > Workspace > Project düzeninde, miras göstergeleriyle birlikte görün
- **Drag-and-drop** — memory'leri scope'lar arasında, skill'leri Global ile repo bazlı klasörler arasında, MCP server'larını config'ler arasında taşıyın
- **Taşıma onayı** — Her taşıma işleminde, dosyalara dokunmadan önce bir onay modal'ı açılır
- **Aynı tür güvenliği** — Memory öğeleri yalnızca memory klasörlerine, skill öğeleri skill klasörlerine, MCP kayıtları yalnızca MCP config'lerine taşınabilir
- **Arama ve filtreleme** — Tüm öğelerde anında arama yapın; kategoriye göre filtreleyin (Memory, Skills, MCP, Config, Hooks, Plugins, Plans)
- **Context Budget** — Herhangi bir şey yazmadan önce config'inizin kaç token tükettiğini görün — öğe bazında döküm, miras alınan scope maliyetleri, tahmini sistem overhead'i ve kullanılan 200K context yüzdesi
- **Detay paneli** — Herhangi bir öğeye tıklayıp tam metadata'yı, açıklamayı, dosya yolunu görün ve VS Code'da açın
- **Project bazında tam tarama** — Her scope'ta tüm öğe türleri taranır: memory'ler, skill'ler, MCP server'ları, config'ler, hook'lar ve planlar
- **Gerçek dosya taşıma** — Sadece görüntülemez; `~/.claude/` içindeki dosyaları gerçekten taşır
- **100+ E2E test** — Dosya sistemi doğrulaması, güvenlik (path traversal, hatalı input), context budget ve tüm 11 kategoriyi kapsayan Playwright test paketi

## Hızlı başlangıç

### Seçenek 1: npx (kurulum gerekmez)

```bash
npx @mcpware/claude-code-organizer
```

### Seçenek 2: Global kurulum

```bash
npm install -g @mcpware/claude-code-organizer
claude-code-organizer
```

### Seçenek 3: Claude'a sor

Bunu Claude Code içine yapıştırın:

> `npx @mcpware/claude-code-organizer` komutunu çalıştır; bu araç Claude Code ayarlarını yönetmek için bir dashboard açar. Hazır olunca URL'yi söyle.

`http://localhost:3847` adresinde bir dashboard açılır. Gerçek `~/.claude/` dizininizle çalışır.

## Neleri yönetir

| Tür | Görüntüle | Taşı | Nerede taranır | Neden kilitli? |
|------|:----:|:----:|:----------:|-------------|
| Memory (feedback, user, project, reference) | Evet | Evet | Global + Project | — |
| Skills | Evet | Evet | Global + Project | — |
| MCP Servers | Evet | Evet | Global + Project | — |
| Config (CLAUDE.md, settings.json) | Evet | Kilitli | Global + Project | Sistem ayarları; taşınırsa config bozulabilir |
| Hooks | Evet | Kilitli | Global + Project | Settings context'ine bağlıdır; taşınırsa sessiz hatalara yol açabilir |
| Plans | Evet | Evet | Global + Project | — |
| Plugins | Evet | Kilitli | Global only | Claude Code'un yönettiği cache |

## Scope hiyerarşisi

```
Global                       <- applies everywhere
  Company (workspace)        <- applies to all sub-projects
    CompanyRepo1             <- project-specific
    CompanyRepo2             <- project-specific
  SideProjects (project)     <- independent project
  Documents (project)        <- independent project
```

Alt scope'lar, üst scope'lardaki memory, skill ve MCP server'larını miras alır.

## Nasıl çalışır

1. **`~/.claude/` dizinini tarar** — tüm project'leri, memory'leri, skill'leri, MCP server'larını, hook'ları, plugin'leri ve planları keşfeder
2. **Scope hiyerarşisini belirler** — file system path'lerinden parent-child ilişkilerini çıkarır
3. **Dashboard'u render eder** — scope başlıkları > kategori çubukları > öğe satırları; doğru girintilemeyle
4. **Taşımaları yönetir** — bir öğeyi sürüklediğinizde ya da "Move to..." seçeneğine tıkladığınızda, güvenlik kontrolleriyle dosyaları diskte gerçekten taşır

## Karşılaştırma

Bulabildiğimiz tüm Claude Code config araçlarına baktık. Hiçbiri, bağımsız bir dashboard içinde görsel scope hiyerarşisini ve scope'lar arası drag-and-drop taşımayı birlikte sunmuyordu.

| İhtiyacım olan | Desktop app (600+⭐) | VS Code extension | Full-stack web app | **Claude Code Organizer** |
|---------|:---:|:---:|:---:|:---:|
| Scope hiyerarşisi ağacı | Hayır | Evet | Kısmen | **Evet** |
| Drag-and-drop taşıma | Hayır | Hayır | Hayır | **Evet** |
| Scope'lar arası taşıma | Hayır | Tek tık | Hayır | **Evet** |
| Eski öğeleri silme | Hayır | Hayır | Hayır | **Evet** |
| Context budget (token breakdown) | Hayır | Hayır | Hayır | **Evet** |
| MCP araçları | Hayır | Hayır | Evet | **Evet** |
| Sıfır bağımlılık | Hayır (Tauri) | Hayır (VS Code) | Hayır (React+Rust+SQLite) | **Evet** |
| Bağımsız çalışma (IDE gerekmez) | Evet | Hayır | Evet | **Evet** |

## Platform desteği

| Platform | Durum |
|----------|:------:|
| Ubuntu / Linux | Destekleniyor |
| macOS (Intel + Apple Silicon) | Destekleniyor (topluluk tarafından Sequoia M3 üzerinde test edildi) |
| Windows | Henüz yok |
| WSL | Muhtemelen çalışır (test edilmedi) |

## Proje yapısı

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

Frontend ile backend tamamen ayrıdır. Görünümü değiştirmek için `src/ui/` altını düzenlemeniz yeterlidir; logic katmanına dokunmanız gerekmez.

## API

Dashboard bir REST API ile çalışır:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scan` | GET | Tüm özelleştirmeleri tarar; scope'ları, öğeleri ve sayıları döndürür |
| `/api/move` | POST | Bir öğeyi başka bir scope'a taşır (category/name ayrıştırmasını destekler) |
| `/api/delete` | POST | Bir öğeyi kalıcı olarak siler |
| `/api/restore` | POST | Silinen bir dosyayı geri yükler (undo için) |
| `/api/restore-mcp` | POST | Silinen bir MCP server kaydını geri yükler |
| `/api/destinations` | GET | Bir öğe için geçerli taşıma hedeflerini getirir |
| `/api/file-content` | GET | Detay paneli için dosya içeriğini okur |

## Lisans

MIT

## @mcpware'den diğer projeler

| Project | What it does | Install |
|---------|---|---|
| **[Instagram MCP](https://github.com/mcpware/instagram-mcp)** | 23 Instagram Graph API aracı; post'lar, yorumlar, DM'ler, story'ler, analytics | `npx @mcpware/instagram-mcp` |
| **[UI Annotator](https://github.com/mcpware/ui-annotator-mcp)** | Herhangi bir web sayfasında hover label'ları gösterir; AI öğelere adıyla referans verir | `npx @mcpware/ui-annotator` |
| **[Pagecast](https://github.com/mcpware/pagecast)** | MCP üzerinden tarayıcı oturumlarını GIF ya da video olarak kaydeder | `npx @mcpware/pagecast` |
| **[LogoLoom](https://github.com/mcpware/logoloom)** | AI logo tasarımı → SVG → tam brand kit export'u | `npx @mcpware/logoloom` |

## Yazar

[ithiria894](https://github.com/ithiria894) - Claude Code ekosistemi için araçlar geliştiriyor.
````

İsterseniz bir sonraki adımda bunu mevcut [README.tr.md](/home/nicole/MyGithub/claude-code-organizer/README.tr.md) dosyasına uygulanacak tek parça patch formatında da hazırlayabilirim.
