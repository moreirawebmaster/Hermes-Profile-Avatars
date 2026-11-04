# Hermes Profile Avatars

> 🌍 **Читать на других языках:** [English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [中文](README.zh-CN.md) · [日本語](README.ja.md) · [Italiano](README.it.md) · [Русский](README.ru.md)

Плагин для десктоп-приложения [Hermes Agent](https://github.com/NousResearch/hermes-agent), который добавляет **реальные аватары профилей** везде, где приложение обычно показывает инициалы — в ответственных на карточках канбана, в значках профилей сайдбара сессий и в марках агентов.

![hermes-desktop-plugin](https://img.shields.io/badge/hermes-desktop%20plugin-8b5cf6) ![License: MIT](https://img.shields.io/badge/license-MIT-green)

## Скриншоты

Реальные аватары в сайдбаре сессий (значки владельцев + стопка участников межагентских диалогов) и на карточках канбана — заголовки размыты, чтобы не показывать имена диалогов:

![Session sidebar with real avatars](screenshots/sidebar-avatars.png)

![Kanban cards with real assignee avatars](screenshots/kanban-avatars.png)

## Проблема

Hermes показывает идентичность профиля как **цветной значок с инициалом** (`K`, `G`, `I`, …) на двух основных поверхностях:

- **Карточки канбана** — аватар ответственного на каждой карточке это `Avatar` → инициалы
- **Сайдбар сессий** — значок профиля-владельца это `ProfileGlyph` → инициалы

Такая компактность — сознательное решение, но если ваши профили — именованные боты с настоящими аватарами (например, "Hunter" × "Hunter council"), список читается гораздо лучше с реальными изображениями.

## Что делает плагин

Отслеживает DOM (MutationObserver) в поисках двух маркеров идентичности, которые рендерит ядро:

| Поверхность ядра | DOM-хук |
|---|---|
| Канбан `Avatar` | `span[title="<profile>"]` |
| Сайдбар `ProfileGlyph` | `[aria-label="Profile: <profile>"]` |

и заменяет их на реальный аватар профиля через `profiles.get_asset`, если он существует. Иначе возвращается к исходному значку с инициалом.

**Бонус канбана:** значок ответственного показывает **аватар + имя профиля** (из `profiles.list` → `ui_meta.hermes-bots.title`), с многоточием, если имя слишком длинное.

**Без патчей ядра. Без пересборки. Обычный десктоп-плагин** — горячо перезагружается приложением.

## Установка

```bash
git clone https://github.com/moreirawebmaster/Hermes-Profile-Avatars ~/.hermes/desktop-plugins/profile-avatars
```

(или положите `plugin.js` в `~/.hermes/desktop-plugins/profile-avatars/`)

Затем перезагрузите плагины в десктоп-приложении: **⌘K → «Reload desktop plugins»** (или перезапустите приложение).

### Требования

- Десктоп-приложение Hermes с plugin SDK (любая свежая сборка)
- Аватары профилей сохранены на сервере через `profiles.set_asset` (плагин Bot Mode, `hermes-bots`, делает это автоматически — либо положите `assets/avatar.png` в каталог каждого профиля)

## Как задать аватары

Плагин читает аватары из **хранилища ассетов профилей** (`profiles.get_asset` → `assets/avatar.png`). Задать их можно так:

```bash
# через UI плагина Hermes Bot Mode (правый клик по боту → Edit Profile → avatar)
# или программно:
hermes profile create my-bot
cp face.png ~/.hermes/profiles/my-bot/assets/avatar.png
```

## Разработка

```bash
# живое редактирование — приложение горячо перезагружает plugin.js при сохранении
$EDITOR ~/.hermes/desktop-plugins/profile-avatars/plugin.js
```

## Лицензия

MIT © Perstein
