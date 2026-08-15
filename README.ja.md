# Hermes Profile Avatars

> 🌍 **表示言語:** [English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [中文](README.zh-CN.md) · [日本語](README.ja.md) · [Italiano](README.it.md)

[Hermes Agent](https://github.com/NousResearch/hermes-agent) のデスクトッププラグイン。アプリが通常イニシャルを表示する場所すべてに**実際のプロフィールアバター**を表示します — かんばんカードの担当者、セッションサイドバーのプロフィールチップ、エージェントのIDマークなど。

![hermes-desktop-plugin](https://img.shields.io/badge/hermes-desktop%20plugin-8b5cf6) ![ライセンス: MIT](https://img.shields.io/badge/license-MIT-green)

## スクリーンショット

セッションサイドバー（所有者チップ + エージェント間参加者スタック）とかんばんカードの担当者に表示される実際のアバター — 会話名のプライバシー保護のためタイトルはぼかしています：

![実際のアバターが表示されたセッションサイドバー](screenshots/sidebar-avatars.png)

![実際の担当者アバターが表示されたかんばんカード](screenshots/kanban-avatars.png)

## 問題

Hermes は2つの主要な画面でプロフィールのIDを**色付きイニシャルチップ**（`K`、`G`、`I` …）として表示します：

- **かんばんカード** — 各カードの担当者アバターは `Avatar` → イニシャル
- **セッションサイドバー** — 所有者プロフィールのチップは `ProfileGlyph` → イニシャル

設計上コンパクトですが、プロフィールが実際のアバターを持つ名前付きボット（例：ハンター×ハンター評議会）の場合、実際の顔を表示すると名簿がはるかに読みやすくなります。

## 機能

コアが描画する2つのIDマークをDOM（MutationObserver）で監視します：

| コアの画面 | DOMフック |
|---|---|
| かんばん `Avatar` | `span[title="<profile>"]` |
| セッション `ProfileGlyph` | `[aria-label="Profile: <profile>"]` |

そして、存在する場合は `profiles.get_asset` 経由で実際のアバターに置き換えます。存在しない場合は元のイニシャルチップを保持します。

**かんばんボーナス：** 担当者チップに**アバター + プロフィール名**を表示（`profiles.list` → `ui_meta.hermes-bots.title` から取得）。名前が長すぎる場合は省略記号（…）を表示します。

**コアへのパッチなし。再ビルド不要。シンプルなデスクトッププラグイン** — アプリがホットリロードします。

## インストール

```bash
git clone https://github.com/moreirawebmaster/Hermes-Profile-Avatars ~/.hermes/desktop-plugins/profile-avatars
```

（または `plugin.js` を `~/.hermes/desktop-plugins/profile-avatars/` に配置）

デスクトップアプリでプラグインをリロード：**⌘K → "Reload desktop plugins"**（またはアプリを再起動）。

### 要件

- プラグインSDK対応のHermesデスクトップアプリ（最近のビルド）
- `profiles.set_asset` でサーバー側に保存されたプロフィールアバター（Bot Modeプラグイン `hermes-bots` が自動的に行います — または各プロフィールディレクトリに `assets/avatar.png` を配置）

## アバターの設定方法

プラグインは**プロフィールアセットストア**（`profiles.get_asset` → `assets/avatar.png`）からアバターを読み取ります。次のように設定できます：

```bash
# Hermes Bot ModeプラグインのUI経由（ボットを右クリック → Edit Profile → avatar）
# またはプログラム的に：
hermes profile create my-bot
cp face.png ~/.hermes/profiles/my-bot/assets/avatar.png
```

## 開発

```bash
# ライブ編集 — 保存時にアプリがplugin.jsをホットリロード
$EDITOR ~/.hermes/desktop-plugins/profile-avatars/plugin.js
```

## ライセンス

MIT © Perstein
