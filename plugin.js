/**
 * Hermes Profile Avatars — real character avatars everywhere the app shows
 * profile initials (kanban card assignees, session sidebar profile chips).
 *
 * How it works: watches the DOM (MutationObserver) for the identity marks the
 * core renders as initials, and swaps them for the profile's real avatar
 * (profiles.get_asset) when one exists. Also injects the default profile's
 * avatar on session rows, where the core deliberately renders NO chip at all.
 *
 * SAFETY: every mutation we make is IDEMPOTENT — we never touch an element
 * that already has the correct structure, and we never rewrite a wrapper we
 * already created. This prevents observer feedback loops (mutation -> scan ->
 * mutation) that would freeze the app.
 *
 * Install:  git clone … ~/.hermes/desktop-plugins/profile-avatars
 * Reload:   ⌘K → "Reload desktop plugins"
 *
 * Only these imports resolve: @hermes/plugin-sdk, react, react/jsx-runtime.
 */

import { host } from '@hermes/plugin-sdk'

const ID = 'profile-avatars'
const AVATAR_SIZE = '1.25rem'

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

// Same regex the core app uses to detect inter-agent deliveries in message
// text: "Message from 🤖 Name (@handle): ..." or "[Message from agent 'X']".
// Group 2 (@handle) is the sender profile; group 1 the display name.
const AGENT_MESSAGE_RE =
  /^(?:Message from (?:🤖\s*)?([^:\n(]{1,64}?)(?:\s*\(@([a-z0-9][a-z0-9_-]{0,63})\))?:\s*|\[Message from agent '([^']{1,64})'\]\s*)([\s\S]*)$/u

/** Extract the sender profile handle from an inter-agent message line. */
function agentHandleOf(text) {
  if (!text) return null
  const m = AGENT_MESSAGE_RE.exec(text.trim())
  if (!m) return null
  return (m[2] || m[3] || '').trim().toLowerCase() || null
}

/** The smallest span that is the glyph itself (kanban avatar or glyph chip). */
function isGlyphContainer(el) {
  if (!(el instanceof HTMLElement)) return false
  if (el.querySelector('img')) return false // already swapped
  const cls = el.className || ''
  return typeof cls === 'string' && /rounded-full|rounded-\[3px\]|place-items-center/.test(cls)
}

// ── participant stack on session rows ─────────────────────────────────────
// A session whose first message is "Message from 🤖 X (@x): ..." was started
// by another agent. We surface X's avatar next to the row's owner chip so
// every helper that touched the conversation is visible at a glance.

/** True when the row already carries a participant stack (idempotence). */
function hasParticipantStack(row) {
  return Boolean(row.querySelector('[data-pa-stack]'))
}

/**
 * Add the sender's avatar (from the inter-agent title) to the row's actions
 * slot, before the owner chip, overlapping it by a few px. Only fires when
 * the title names an agent AND that agent differs from the row's owner —
 * and only once per row ([data-pa-stack] guard).
 */
async function injectParticipantStack(row) {
  if (!(row instanceof HTMLElement)) return
  if (hasParticipantStack(row)) return

  const titleEl = row.querySelector('.hover-marquee-inner')
  if (!titleEl) return
  const handle = agentHandleOf(titleEl.textContent || '')
  if (!handle) return

  // Owner profile: the row's ProfileGlyph (or default) already in actions.
  const actions = row.querySelector('[data-row-actions]')
  if (!actions) return
  const ownerImg = actions.querySelector('[data-profile-avatar]')
  const owner = ownerImg ? (ownerImg.getAttribute('data-profile-avatar') || '').toLowerCase() : null
  if (!owner || owner === handle) return

  const avatar = await fetchAvatar(handle)
  if (!avatar) return

  const img = makeAvatarImg(handle, avatar, AVATAR_SIZE)
  img.style.marginRight = '-0.375rem' // overlap the owner chip by 6px
  img.style.boxShadow = '0 0 0 2px var(--ui-editor-bg, #0b0b0f)'
  img.setAttribute('data-pa-stack', 'true')

  const wrap = document.createElement('span')
  wrap.setAttribute('data-pa-stack', 'true')
  wrap.style.display = 'inline-flex'
  wrap.style.alignItems = 'center'
  wrap.appendChild(img)
  actions.prepend(wrap)
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

  const size = el.style.height || AVATAR_SIZE
  el.replaceWith(makeAvatarImg(name, avatar, size))
  swapped.add(el)
}

// ── default-profile injection on session rows ───────────────────────────────
// The core renders NO profile chip for the default profile (by design), so
// "Netero — conselho" rows show a bare bullet. We inject the default avatar
// into any session row that has no ProfileGlyph, i.e. rows whose session
// belongs to the default profile (named profiles ALWAYS render a chip).
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

/**
 * True when the default avatar img is already in the canonical structure:
 * a <span><img/></span> child of [data-row-actions] with the right size.
 * Checks structure ONLY — never mutates, so it cannot feed the observer loop.
 */
function defaultAvatarAlreadyInjected(row, actions) {
  const img = row.querySelector('[data-profile-avatar="default"]')
  if (!img || !(img instanceof HTMLElement)) return false
  if (img.style.width !== AVATAR_SIZE || img.style.height !== AVATAR_SIZE) return false
  const parent = img.parentElement
  // Canonical: img inside a plain <span> that is a direct child of actions.
  return Boolean(actions && parent && parent.parentElement === actions && parent.tagName === 'SPAN')
}

/** Inject the default avatar into a session row that lacks a profile chip. */
function injectDefaultAvatar(row) {
  if (!(row instanceof HTMLElement)) return
  // Rows with a ProfileGlyph already carry a named profile — skip them.
  if (row.querySelector('[aria-label^="Profile: "]')) return

  const avatar = defaultAvatar.data
  if (!avatar) return

  const actions = row.querySelector('[data-row-actions]')
  const dot = row.querySelector('[data-session-dot], .arc-border, [class*="size-1.5"], [class*="size-2"]')

  // Idempotence guard: if the canonical structure already exists, only strip
  // a stale marginRight left by an older plugin version (0.5rem experiment),
  // then do NOTHING else. Setting marginRight to '' when it is already '' is
  // a no-op for the style object but still a DOM attribute write, so gate it.
  if (defaultAvatarAlreadyInjected(row, actions)) {
    const img = row.querySelector('[data-profile-avatar="default"]')
    const wrap = img && img.parentElement
    if (wrap instanceof HTMLElement && wrap.style.marginRight) {
      wrap.style.marginRight = ''
    }
    return
  }

  // If an img exists but in a stale position/size, MOVE it into place once.
  const existing = row.querySelector('[data-profile-avatar="default"]')
  if (existing && existing instanceof HTMLElement) {
    existing.style.width = AVATAR_SIZE
    existing.style.height = AVATAR_SIZE
    if (actions) {
      const wrap = document.createElement('span')
      wrap.appendChild(existing)
      actions.prepend(wrap)
    } else if (dot) {
      dot.after(existing)
    }
    return
  }

  const img = makeAvatarImg('default', avatar, AVATAR_SIZE)

  if (actions) {
    // Plain span — exactly what the core's trailing.map wraps ProfileTag in.
    // NO extra margin: the default avatar must sit exactly like the named
    // profiles' chips (Meruem, Ging…), sharing the flex gap-1 of the slot.
    const wrap = document.createElement('span')
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
let scanScheduled = false

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
    // Inter-agent sessions: surface the sender's avatar next to the owner.
    void injectParticipantStack(row)
  }
}

/**
 * Debounced scan: coalesces a burst of mutations into ONE scan per tick.
 * Without this, every mutation we make (or the app makes) re-triggers a full
 * scan synchronously — the exact feedback loop that froze the app.
 */
function requestScan() {
  if (scanScheduled) return
  scanScheduled = true
  setTimeout(() => {
    scanScheduled = false
    scan(document)
  }, 150)
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
        observer = new MutationObserver(() => {
          requestScan()
        })
        observer.observe(document.body, { childList: true, subtree: true, attributes: true })
      }

      // Periodic safety net: catches rows/avatars the observer missed and
      // retries transient get_asset misses after the TTL window.
      if (!interval) {
        interval = setInterval(() => requestScan(), 5000)
      }
    }
    boot()
  }
}
