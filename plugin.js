/**
 * Hermes Profile Avatars — real character avatars everywhere the app shows
 * profile initials (kanban card assignees, session sidebar profile chips).
 *
 * How it works: watches the DOM (MutationObserver) for the identity marks the
 * core renders as initials, and swaps them for the profile's real avatar
 * (profiles.get_asset) when one exists. Also injects the default profile's
 * avatar on session rows, where the core deliberately renders NO chip at all.
 *
 * Install:  git clone … ~/.hermes/desktop-plugins/profile-avatars
 * Reload:   ⌘K → "Reload desktop plugins"
 *
 * Only these imports resolve: @hermes/plugin-sdk, react, react/jsx-runtime.
 */

import { host } from '@hermes/plugin-sdk'

const ID = 'profile-avatars'

// ── avatar cache (TTL so transient gateway misses get retried) ─────────────
// name -> { data: string|null, at: number }
const avatarCache = new Map()
const avatarInflight = new Set()
const CACHE_TTL_MS = 30_000

async function fetchAvatar(name) {
  const hit = avatarCache.get(name)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data
  if (avatarInflight.has(name)) return null

  avatarInflight.add(name)
  try {
    const res = await host.request('profiles.get_asset', { name, asset: 'avatar' })
    const data = res?.found && res.data ? res.data : null
    avatarCache.set(name, { data, at: Date.now() })
    return data
  } catch {
    avatarCache.set(name, { data: null, at: Date.now() })
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

// Elements we've already swapped (not "attempted" — failed ones retry via TTL).
const swapped = new WeakSet()

function makeAvatarImg(name, avatar, size) {
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
  img.setAttribute('draggable', 'false')
  return img
}

/** Swap one element (initials) for an avatar <img>. Returns true if swapped. */
async function swapIfAvatar(el) {
  if (swapped.has(el)) return
  const name = profileNameOf(el)
  if (!name) return

  const avatar = await fetchAvatar(name)
  if (!avatar) return // retry on the next scan (TTL)

  const size = el.style.height || '1.25rem'
  el.replaceWith(makeAvatarImg(name, avatar, size))
  swapped.add(el)
}

// ── default-profile injection on session rows ───────────────────────────────
// The core renders NO profile chip for the default profile (by design), so
// "Netero — conselho" rows show a bare bullet. We inject the default avatar
// into any session row that has no ProfileGlyph, i.e. rows whose session
// belongs to the default profile (named profiles ALWAYS render a chip).
const DEFAULT_ATTR = 'data-profile-avatar'
const defaultAvatar = { data: null, at: 0, inflight: false }

async function getDefaultAvatar() {
  if (defaultAvatar.data && Date.now() - defaultAvatar.at < CACHE_TTL_MS) return defaultAvatar.data
  if (defaultAvatar.inflight) return null
  defaultAvatar.inflight = true
  try {
    const res = await host.request('profiles.get_asset', { name: 'default', asset: 'avatar' })
    defaultAvatar.data = res?.found && res.data ? res.data : null
    defaultAvatar.at = Date.now()
    return defaultAvatar.data
  } catch {
    return null
  } finally {
    defaultAvatar.inflight = false
  }
}

/** Inject the default avatar into a session row that lacks a profile chip.
 *  Named profiles render their chip inside a trailing wrapper span within
 *  [data-row-actions]; the default profile renders NO chip, so we replicate
 *  the exact same markup (wrapper span + img) at the front of that slot —
 *  same size, same gap, same alignment as every other profile. */
function injectDefaultAvatar(row) {
  if (!(row instanceof HTMLElement)) return
  // Rows with a ProfileGlyph already carry a named profile — skip them.
  if (row.querySelector('[aria-label^="Profile: "]')) return

  const avatar = defaultAvatar.data
  if (!avatar) return

  const actions = row.querySelector('[data-row-actions]')
  const dot = row.querySelector('[data-session-dot], .arc-border, [class*="size-1.5"], [class*="size-2"]')

  // Already injected? Ensure it sits in the actions slot AND has the
  // current size — a hot-reloaded plugin must not leave a stale img
  // from an older version (14px vs 20px) behind.
  const existing = row.querySelector('[data-profile-avatar]')
  if (existing) {
    existing.style.width = '1.25rem'
    existing.style.height = '1.25rem'
    if (actions && existing.parentElement !== actions) {
      const wrap = document.createElement('span')
      wrap.className = 'inline-flex justify-end'
      actions.prepend(wrap)
      wrap.appendChild(existing)
    }
    return
  }

  const img = makeAvatarImg('default', avatar, '1.25rem')

  if (actions) {
    // Same wrapper the core gives every ProfileTag: inline-flex, right-aligned.
    const wrap = document.createElement('span')
    wrap.className = 'inline-flex justify-end'
    wrap.appendChild(img)
    actions.prepend(wrap)
  } else if (dot) {
    // Fallback: no actions slot (rare) — place after the status dot.
    dot.after(img)
  }
}

/** Session rows: rows inside the session list that are NOT the search input. */
function sessionRowsOf(root) {
  const rows = []
  for (const el of root.querySelectorAll('[data-slot="sidebar"] [data-working], [class*="row-hover"]')) {
    if (el.closest('[data-slot="sidebar-input"], [data-slot="sidebar-trigger"]')) continue
    rows.push(el)
  }
  return rows
}

// ── scanning ─────────────────────────────────────────────────────────────────
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

  // Default-profile rows: no chip anywhere -> inject the Netero avatar.
  const rows = sessionRowsOf(root)
  for (const row of rows) {
    injectDefaultAvatar(row)
  }
}

let observer = null
let interval = null

export default {
  id: ID,
  name: 'Profile Avatars',
  register() {
    const boot = () => {
      if (!document.body) {
        setTimeout(boot, 200)
        return
      }

      // Prime the default avatar so injection is synchronous on later scans.
      void getDefaultAvatar()

      scan(document)

      if (!observer) {
        observer = new MutationObserver(mutations => {
          let needsScan = false
          for (const m of mutations) {
            if (m.type !== 'childList' && m.type !== 'attributes') continue
            needsScan = true
            break
          }
          if (needsScan) scan(document)
        })
        observer.observe(document.body, { childList: true, subtree: true, attributes: true })
      }

      // Periodic safety net: catches rows/avatars the observer missed and
      // retries transient get_asset misses after the TTL window.
      if (!interval) {
        interval = setInterval(() => {
          // Re-arm cached nulls after TTL by dropping stale entries lazily.
          scan(document)
        }, 5000)
      }
    }
    boot()
  }
}
