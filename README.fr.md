# Hermes Profile Avatars

> 🌍 **Lire en :** [English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [中文](README.zh-CN.md) · [日本語](README.ja.md) · [Italiano](README.it.md)

Plugin de bureau du [Hermes Agent](https://github.com/NousResearch/hermes-agent) qui place **de vrais avatars de profil** partout où l'application affiche normalement des initiales — responsables de cartes sur le kanban, pastilles de profil dans la barre latérale des sessions et marques d'identité des agents.

![hermes-desktop-plugin](https://img.shields.io/badge/hermes-desktop%20plugin-8b5cf6) ![Licence : MIT](https://img.shields.io/badge/license-MIT-green)

## Captures d'écran

De vrais avatars dans la barre latérale des sessions (pastilles du propriétaire + pile de participants inter-agents) et sur les responsables des cartes du kanban — titres floutés pour préserver la confidentialité des noms de conversations :

![Barre latérale de sessions avec de vrais avatars](screenshots/sidebar-avatars.png)

![Cartes du kanban avec de vrais avatars des responsables](screenshots/kanban-avatars.png)

## Problème

Hermes affiche l'identité d'un profil sous forme de **pastille d'initiale colorée** (`K`, `G`, `I`, …) sur deux surfaces principales :

- **Cartes du kanban** — l'avatar du responsable sur chaque carte est `Avatar` → initiales
- **Barre latérale des sessions** — la pastille du profil propriétaire est `ProfileGlyph` → initiales

C'est compact par conception, mais quand vos profils sont des bots nommés avec de vrais avatars (par ex. un conseil Hunter × Hunter), le roster se lit bien mieux avec le vrai visage.

## Ce qu'il fait

Observe le DOM (MutationObserver) pour les deux marques d'identité rendues par le cœur :

| Surface du cœur | Hook DOM |
|---|---|
| `Avatar` du kanban | `span[title="<profil>"]` |
| `ProfileGlyph` de session | `[aria-label="Profile: <profil>"]` |

et les remplace par le vrai avatar du profil via `profiles.get_asset` lorsqu'il existe. Sinon, il conserve la pastille d'initiale d'origine.

**Bonus kanban :** la pastille du responsable affiche **avatar + nom du profil** (depuis `profiles.list` → `ui_meta.hermes-bots.title`), avec des points de suspension quand le nom est trop long.

**Aucun patch au cœur. Aucune recompilation. Simple plugin de bureau** — rechargé à chaud par l'application.

## Installation

```bash
git clone https://github.com/moreirawebmaster/Hermes-Profile-Avatars ~/.hermes/desktop-plugins/profile-avatars
```

(ou déposez `plugin.js` dans `~/.hermes/desktop-plugins/profile-avatars/`)

Rechargez ensuite les plugins dans l'application de bureau : **⌘K → « Reload desktop plugins »** (ou redémarrez l'application).

### Prérequis

- Application de bureau Hermes avec le SDK de plugins (n'importe quelle version récente)
- Avatars de profil stockés côté serveur via `profiles.set_asset` (le plugin Bot Mode, `hermes-bots`, le fait automatiquement — ou placez `assets/avatar.png` dans le répertoire de chaque profil)

## Comment définir les avatars

Le plugin lit les avatars depuis le **magasin d'assets du profil** (`profiles.get_asset` → `assets/avatar.png`). Vous pouvez les définir ainsi :

```bash
# via l'interface du plugin Hermes Bot Mode (clic droit sur le bot → Edit Profile → avatar)
# ou par programmation :
hermes profile create my-bot
cp face.png ~/.hermes/profiles/my-bot/assets/avatar.png
```

## Développement

```bash
# édition en direct — l'application recharge plugin.js à la sauvegarde
$EDITOR ~/.hermes/desktop-plugins/profile-avatars/plugin.js
```

## Licence

MIT © Perstein
