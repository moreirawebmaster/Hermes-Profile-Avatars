# Hermes Profile Avatars

> 🌍 **阅读语言:** [English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [中文](README.zh-CN.md) · [日本語](README.ja.md) · [Italiano](README.it.md)

[Hermes Agent](https://github.com/NousResearch/hermes-agent) 的桌面插件，可在应用通常只显示首字母的地方显示**真实头像** — 看板卡片负责人、会话侧边栏个人资料徽章以及代理身份标识。

![hermes-desktop-plugin](https://img.shields.io/badge/hermes-desktop%20plugin-8b5cf6) ![许可证: MIT](https://img.shields.io/badge/license-MIT-green)

## 截图

会话侧边栏（所有者徽章 + 跨代理参与者堆叠）和看板卡片负责人中的真实头像 — 标题已模糊处理以保护对话名称隐私：

![带有真实头像的会话侧边栏](screenshots/sidebar-avatars.png)

![带有真实负责人头像的看板卡片](screenshots/kanban-avatars.png)

## 问题

Hermes 在两个核心界面中将个人资料标识显示为**彩色首字母徽章**（`K`、`G`、`I` …）：

- **看板卡片** — 每张卡片上的负责人头像为 `Avatar` → 首字母
- **会话侧边栏** — 所有者个人资料徽章为 `ProfileGlyph` → 首字母

这在设计上很紧凑，但当你的个人资料是带有真实头像的命名机器人（例如猎人 × 猎人议会）时，显示真实面孔会让名单更易读。

## 功能

监视 DOM（MutationObserver）以查找核心渲染的两个身份标记：

| 核心界面 | DOM 钩子 |
|---|---|
| 看板 `Avatar` | `span[title="<profile>"]` |
| 会话 `ProfileGlyph` | `[aria-label="Profile: <profile>"]` |

并在存在真实头像时通过 `profiles.get_asset` 将其替换。否则保留原始首字母徽章。

**看板附加功能：** 负责人徽章显示**头像 + 个人资料名称**（来自 `profiles.list` → `ui_meta.hermes-bots.title`），名称过长时显示省略号。

**无需修补核心。无需重新构建。纯桌面插件** — 由应用热重载。

## 安装

```bash
git clone https://github.com/moreirawebmaster/Hermes-Profile-Avatars ~/.hermes/desktop-plugins/profile-avatars
```

（或将 `plugin.js` 放入 `~/.hermes/desktop-plugins/profile-avatars/`）

然后在桌面应用中重新加载插件：**⌘K → "Reload desktop plugins"**（或重启应用）。

### 要求

- 带插件 SDK 的 Hermes 桌面应用（任意较新版本）
- 通过 `profiles.set_asset` 在服务端存储个人资料头像（Bot Mode 插件 `hermes-bots` 会自动完成 — 或将 `assets/avatar.png` 放入每个个人资料目录）

## 如何设置头像

插件从**个人资料资源存储**（`profiles.get_asset` → `assets/avatar.png`）读取头像。你可以这样设置：

```bash
# 通过 Hermes Bot Mode 插件界面（右键机器人 → Edit Profile → avatar）
# 或以编程方式：
hermes profile create my-bot
cp face.png ~/.hermes/profiles/my-bot/assets/avatar.png
```

## 开发

```bash
# 实时编辑 — 应用会在保存时热重载 plugin.js
$EDITOR ~/.hermes/desktop-plugins/profile-avatars/plugin.js
```

## 许可证

MIT © Perstein
