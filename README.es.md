# Hermes Profile Avatars

> 🌍 **Lee en:** [English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [中文](README.zh-CN.md) · [日本語](README.ja.md) · [Italiano](README.it.md)

Plugin de escritorio del [Hermes Agent](https://github.com/NousResearch/hermes-agent) que pone **avatares reales de perfil** en todos los lugares donde la app normalmente muestra iniciales — responsables de tarjetas en el kanban, chips de perfil en la barra lateral de sesiones y marcas de identidad de agentes.

![hermes-desktop-plugin](https://img.shields.io/badge/hermes-desktop%20plugin-8b5cf6) ![Licencia: MIT](https://img.shields.io/badge/license-MIT-green)

## Capturas

Avatares reales en la barra lateral de sesiones (chips del propietario + pila de participantes entre agentes) y en los responsables de las tarjetas del kanban — títulos difuminados para preservar la privacidad de los nombres de las conversaciones:

![Barra lateral de sesiones con avatares reales](screenshots/sidebar-avatars.png)

![Tarjetas del kanban con avatares reales de los responsables](screenshots/kanban-avatars.png)

## Problema

Hermes muestra la identidad de un perfil como un **chip de inicial de color** (`K`, `G`, `I`, …) en dos superficies principales:

- **Tarjetas del kanban** — el avatar del responsable en cada tarjeta es `Avatar` → iniciales
- **Barra lateral de sesiones** — el chip del perfil propietario es `ProfileGlyph` → iniciales

Es compacto por diseño, pero cuando tus perfiles son bots con nombres y avatares reales (p. ej. un consejo de Hunter × Hunter), el roster se lee mucho mejor con la cara real.

## Qué hace

Observa el DOM (MutationObserver) buscando las dos marcas de identidad que renderiza el núcleo:

| Superficie del núcleo | Hook en el DOM |
|---|---|
| `Avatar` del kanban | `span[title="<perfil>"]` |
| `ProfileGlyph` de sesión | `[aria-label="Profile: <perfil>"]` |

y las sustituye por el avatar real del perfil mediante `profiles.get_asset` cuando existe. Si no, conserva el chip de inicial original.

**Bonus del kanban:** el chip del responsable muestra **avatar + nombre del perfil** (desde `profiles.list` → `ui_meta.hermes-bots.title`), con puntos suspensivos cuando el nombre es demasiado largo.

**Sin parches al núcleo. Sin recompilar. Plugin de escritorio simple** — con hot-reload por la app.

## Instalación

```bash
git clone https://github.com/moreirawebmaster/Hermes-Profile-Avatars ~/.hermes/desktop-plugins/profile-avatars
```

(o copia `plugin.js` a `~/.hermes/desktop-plugins/profile-avatars/`)

Después recarga los plugins en la app de escritorio: **⌘K → "Reload desktop plugins"** (o reinicia la app).

### Requisitos

- App de escritorio de Hermes con el SDK de plugins (cualquier build reciente)
- Avatares de perfil almacenados en el servidor mediante `profiles.set_asset` (el plugin Bot Mode, `hermes-bots`, lo hace automáticamente — o coloca `assets/avatar.png` en el directorio de cada perfil)

## Cómo se definen los avatares

El plugin lee los avatares del **almacén de assets del perfil** (`profiles.get_asset` → `assets/avatar.png`). Puedes definirlos así:

```bash
# mediante la UI del plugin Hermes Bot Mode (clic derecho en el bot → Edit Profile → avatar)
# o programáticamente:
hermes profile create my-bot
cp face.png ~/.hermes/profiles/my-bot/assets/avatar.png
```

## Desarrollo

```bash
# edición en vivo — la app recarga plugin.js al guardar
$EDITOR ~/.hermes/desktop-plugins/profile-avatars/plugin.js
```

## Licencia

MIT © Perstein
