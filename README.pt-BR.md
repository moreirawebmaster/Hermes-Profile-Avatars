# Hermes Profile Avatars

> 🌍 **Leia em:** [English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [中文](README.zh-CN.md) · [日本語](README.ja.md) · [Italiano](README.it.md)

Plugin de desktop do [Hermes Agent](https://github.com/NousResearch/hermes-agent) que coloca **avatares reais de perfil** em todos os lugares onde o app normalmente mostra iniciais — responsáveis de cards no kanban, chips de perfil no sidebar de sessões e marcas de identidade de agentes.

![hermes-desktop-plugin](https://img.shields.io/badge/hermes-desktop%20plugin-8b5cf6) ![Licença: MIT](https://img.shields.io/badge/license-MIT-green)

## Screenshots

Avatares reais no sidebar de sessões (chips do dono + stack de participantes inter-agentes) e nos responsáveis de cards do kanban — títulos desfocados para preservar a privacidade dos nomes de conversas:

![Sidebar de sessões com avatares reais](screenshots/sidebar-avatars.png)

![Cards do kanban com avatares reais dos responsáveis](screenshots/kanban-avatars.png)

## Problema

O Hermes mostra a identidade de um perfil como um **chip de inicial colorido** (`K`, `G`, `I`, …) em duas superfícies principais:

- **Cards do kanban** — o avatar do responsável em cada card é `Avatar` → iniciais
- **Sidebar de sessões** — o chip do perfil dono é `ProfileGlyph` → iniciais

Isso é compacto por design, mas quando seus perfis são bots nomeados com avatares reais (ex.: um conselho de Hunter × Hunter), o roster fica muito melhor com o rosto de verdade.

## O que ele faz

Observa o DOM (MutationObserver) em busca das duas marcas de identidade que o core renderiza:

| Superfície do core | Hook no DOM |
|---|---|
| `Avatar` do kanban | `span[title="<perfil>"]` |
| `ProfileGlyph` de sessão | `[aria-label="Profile: <perfil>"]` |

e as troca pelo avatar real do perfil via `profiles.get_asset` quando existe. Caso contrário, mantém o chip de inicial original.

**Bônus do kanban:** o chip do responsável mostra **avatar + nome do perfil** (via `profiles.list` → `ui_meta.hermes-bots.title`), com reticências quando o nome é longo demais.

**Sem patches no core. Sem rebuild. Plugin de desktop simples** — com hot-reload pelo app.

## Instalação

```bash
git clone https://github.com/moreirawebmaster/Hermes-Profile-Avatars ~/.hermes/desktop-plugins/profile-avatars
```

(ou copie `plugin.js` para `~/.hermes/desktop-plugins/profile-avatars/`)

Depois recarregue os plugins no app desktop: **⌘K → "Reload desktop plugins"** (ou reinicie o app).

### Requisitos

- App desktop do Hermes com o SDK de plugins (qualquer build recente)
- Avatares de perfil armazenados no servidor via `profiles.set_asset` (o plugin Bot Mode, `hermes-bots`, faz isso automaticamente — ou coloque `assets/avatar.png` no diretório de cada perfil)

## Como os avatares são definidos

O plugin lê os avatares do **armazenamento de assets do perfil** (`profiles.get_asset` → `assets/avatar.png`). Você pode defini-los assim:

```bash
# via a UI do plugin Hermes Bot Mode (clique direito no bot → Edit Profile → avatar)
# ou programaticamente:
hermes profile create my-bot
cp face.png ~/.hermes/profiles/my-bot/assets/avatar.png
```

## Desenvolvimento

```bash
# edição ao vivo — o app faz hot-reload do plugin.js ao salvar
$EDITOR ~/.hermes/desktop-plugins/profile-avatars/plugin.js
```

## Licença

MIT © Perstein
