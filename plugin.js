/**
 * Hermes Profile Avatars — real character avatars everywhere the app shows
 * profile initials (kanban card assignees, session sidebar profile chips).
 *
 * How it works: watches the DOM (MutationObserver) for the two identity marks
 * the core renders as initials:
 *   - kanban <Avatar>:      span[title="<profile>"] with the initials text
 *   - session ProfileGlyph: span[aria-label="Profile: <profile>"]
 * and swaps them for the profile's real avatar (profiles.get_asset) when one
 * exists. Falls back to the original initial chip otherwise. No core patches,
 * no rebuild — plain desktop plugin, hot-reloaded by the app.
 *
 * Install:  git clone … ~/.hermes/desktop-plugins/profile-avatars
 * Reload:   ⌘K → "Reload desktop plugins"
 *
 * Only these imports resolve: @hermes/plugin-sdk, react, react/jsx-runtime.
 */

import { host } from '@hermes/plugin-sdk'

const ID = 'profile-avatars'

// ── avatar cache ────────────────────────────────────────────────────────────
// profile name -> data URL (or null when the profile has no avatar).
const avatarCache = new Map()
const avatarInflight = new Set()

async function fetchAvatar(name) {
  if (avatarCache.has(name)) return avatarCache.get(name)
  if (avatarInflight.has(name)) return null

  avatarInflight.add(name)
  try {
    const res = await host.request('profiles.get_asset', { name, asset: 'avatar' })
    const data = res?.found && res.data ? res.data : null
    avatarCache.set(name, data)
    return data
  } catch {
    avatarCache.set(name, null)
    return null
  } finally {
    avatarInflight.delete(name)
  }
}

// ── DOM matching ────────────────────────────────────────────────────────────
const KANBAN_TITLE_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/
const PROFILE_LABEL_RE = /^Profile:\s*([a-z0-9][a-z0-9_-]{0,63})$/i

/** Resolve the profile name from a candidate element, or null. */
function profileNameOf(el) {
  const title = el.getAttribute && el.getAttribute('title')
  if (title && KANBAN_TITLE_RE.test(title) && el.textContent && el.textContent.trim().length <= 3) {
    return title
  }
  const label = el.getAttribute && el.getAttribute('aria-label')
  if (label) {
    const m = PROFILE_LABEL_RE.exec(label)
    if (m) return m[1]
  }
  return null
}

/** The smallest span that is the glyph itself (kanban avatar or glyph chip). */
function isGlyphContainer(el) {
  if (!(el instanceof HTMLElement)) return false
  if (el.querySelector('img')) return false // already swapped
  const cls = el.className || ''
  return typeof cls === 'string' && /rounded-full|rounded-\[3px\]|place-items-center/.test(cls)
}

// Elements we've already processed — the MutationObserver re-fires a lot.
const swapped = new WeakSet()

/** Swap one element (initials) for an avatar <img>. Returns true if swapped. */
async function swapIfAvatar(el) {
  if (swapped.has(el)) return
  const name = profileNameOf(el)
  if (!name) return

  const avatar = await fetchAvatar(name)
  if (!avatar) {
    swapped.add(el) // no avatar — don't re-probe every mutation
    return
  }

  // Keep the chip's visual footprint: inherit size from the current element.
  const size = el.style.height || '1.25rem'
  const img = document.createElement('img')
  img.src = avatar
  img.alt = name
  img.title = name
  img.setAttribute('data-profile-avatar', name)
  img.style.width = size
  img.style.height = size
  img.style.borderRadius = '9999px'
  img.style.objectFit = 'cover'
  img.style.display = 'inline-block'
  img.style.flexShrink = '0'
  // Keep the parent grid centering working.
  img.setAttribute('draggable', 'false')

  el.replaceWith(img)
  swapped.add(img)
}

/** Scan the whole document for candidate glyphs (initial pass + re-scans). */
function scan(root) {
  // Kanban <Avatar name=…> spans have title=profile + short text.
  const kanbanSpans = root.querySelectorAll('span[title]')
  for (const el of kanbanSpans) {
    if (isGlyphContainer(el)) void swapIfAvatar(el)
  }

  // Session sidebar ProfileGlyph chips carry aria-label="Profile: <name>".
  const glyphs = root.querySelectorAll('[aria-label^="Profile: "]')
  for (const el of glyphs) {
    void swapIfAvatar(el)
  }
}

let observer = null

export default {
  id: ID,
  name: 'Profile Avatars',
  register() {
    // Wait for the DOM to exist, then scan and watch.
    const boot = () => {
      if (!document.body) {
        setTimeout(boot, 200)
        return
      }

      // Initial scan covers already-mounted rows.
      scan(document)

      if (!observer) {
        observer = new MutationObserver(mutations => {
          let needsScan = false
          for (const m of mutations) {
            if (m.type !== 'childList') continue
            if (m.addedNodes && m.addedNodes.length) {
              needsScan = true
              break
            }
          }
          if (needsScan) scan(document)
        })
        observer.observe(document.body, { childList: true, subtree: true })
      }
    }
    boot()
  }
}
