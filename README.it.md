# Hermes Profile Avatars

> 🌍 **Leggi in:** [English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [中文](README.zh-CN.md) · [日本語](README.ja.md) · [Italiano](README.it.md)

Plugin desktop per [Hermes Agent](https://github.com/NousResearch/hermes-agent) che mette **avatar reali del profilo** ovunque l'app mostri normalmente le iniziali — assegnatari delle card kanban, chip del profilo nella sidebar delle sessioni e marchi di identità degli agenti.

![hermes-desktop-plugin](https://img.shields.io/badge/hermes-desktop%20plugin-8b5cf6) ![Licenza: MIT](https://img.shields.io/badge/license-MIT-green)

## Screenshot

Avatar reali nella sidebar delle sessioni (chip del proprietario + stack dei partecipanti tra agenti) e sugli assegnatari delle card kanban — titoli sfocati per proteggere la privacy dei nomi delle conversazioni:

![Sidebar delle sessioni con avatar reali](screenshots/sidebar-avatars.png)

![Card kanban con avatar reali degli assegnatari](screenshots/kanban-avatars.png)

## Problema

Hermes mostra l'identità di un profilo come **chip di iniziale colorato** (`K`, `G`, `I`, …) in due superfici principali:

- **Card kanban** — l'avatar dell'assegnatario su ogni card è `Avatar` → iniziali
- **Sidebar delle sessioni** — il chip del profilo proprietario è `ProfileGlyph` → iniziali

È compatto per design, ma quando i tuoi profili sono bot con nome e avatar reali (es. un consiglio di Hunter × Hunter), il roster si legge molto meglio con la faccia vera.

## Cosa fa

Osserva il DOM (MutationObserver) per i due marchi di identità che il core renderizza:

| Superficie del core | Hook DOM |
|---|---|
| `Avatar` del kanban | `span[title="<profilo>"]` |
| `ProfileGlyph` di sessione | `[aria-label="Profile: <profilo>"]` |

e li sostituisce con l'avatar reale del profilo tramite `profiles.get_asset` quando esiste. Altrimenti mantiene il chip di iniziale originale.

**Bonus kanban:** il chip dell'assegnatario mostra **avatar + nome del profilo** (da `profiles.list` → `ui_meta.hermes-bots.title`), con i puntini di sospensione quando il nome è troppo lungo.

**Nessuna patch al core. Nessuna ricompilazione. Semplice plugin desktop** — ricaricato a caldo dall'app.

## Installazione

```bash
git clone https://github.com/moreirawebmaster/Hermes-Profile-Avatars ~/.hermes/desktop-plugins/profile-avatars
```

(oppure copia `plugin.js` in `~/.hermes/desktop-plugins/profile-avatars/`)

Poi ricarica i plugin nell'app desktop: **⌘K → "Reload desktop plugins"** (o riavvia l'app).

### Requisiti

- App desktop di Hermes con SDK plugin (qualsiasi build recente)
- Avatar del profilo salvati lato server tramite `profiles.set_asset` (il plugin Bot Mode, `hermes-bots`, lo fa automaticamente — oppure metti `assets/avatar.png` nella directory di ogni profilo)

## Come si impostano gli avatar

Il plugin legge gli avatar dal **magazzino asset del profilo** (`profiles.get_asset` → `assets/avatar.png`). Puoi impostarli così:

```bash
# tramite l'interfaccia del plugin Hermes Bot Mode (tasto destro sul bot → Edit Profile → avatar)
# o programmaticamente:
hermes profile create my-bot
cp face.png ~/.hermes/profiles/my-bot/assets/avatar.png
```

## Sviluppo

```bash
# modifica live — l'app ricarica plugin.js al salvataggio
$EDITOR ~/.hermes/desktop-plugins/profile-avatars/plugin.js
```

## Licenza

MIT © Perstein
