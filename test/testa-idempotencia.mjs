#!/usr/bin/env node
// testa-idempotencia.mjs — prova que o plugin não cria loop de mutations.
// Verifica a função defaultAvatarAlreadyInjected: retorna true quando a
// estrutura canônica já existe (=> o plugin não faz nada => sem loop) e
// false quando precisa corrigir.
import { readFileSync } from 'fs'

const src = readFileSync(new URL('../plugin.js', import.meta.url), 'utf8')
const fnMatch = src.match(/function defaultAvatarAlreadyInjected[\s\S]*?\n\}/)
if (!fnMatch) { console.error('✗ função não encontrada'); process.exit(1) }

// Stub HTMLElement: elementos fake herdam dele para o instanceof funcionar.
class HTMLStub {}
function makeEl(tag, attrs = {}) {
  const el = Object.create(HTMLStub.prototype)
  Object.assign(el, {
    tagName: tag.toUpperCase(),
    style: {},
    attributes: { ...attrs },
    children: [],
    parentElement: null,
    setAttribute(k, v) { this.attributes[k] = String(v) },
    getAttribute(k) { return this.attributes[k] ?? null },
    appendChild(c) { c.parentElement = this; this.children.push(c) },
    prepend(c) { c.parentElement = this; this.children.unshift(c) },
    querySelector(sel) {
      const walk = n => {
        for (const c of n.children) {
          if (sel.startsWith('[data-profile-avatar=')) {
            const want = sel.match(/"([^"]+)"/)?.[1]
            if (c.attributes['data-profile-avatar'] === want) return c
          }
          const r = walk(c)
          if (r) return r
        }
        return null
      }
      return walk(this)
    }
  })
  return el
}

// Extrai a função com a constante do escopo. O new Function aqui recebe
// apenas código estático do próprio plugin (sem input externo).
const fn = new Function(
  'HTMLElement',
  'const AVATAR_SIZE = "1.25rem";\n' + fnMatch[0] + '; return defaultAvatarAlreadyInjected;'
)(HTMLStub)

// Caso 1: estrutura canônica (span > img 1.25rem dentro de actions) -> TRUE
const actions = makeEl('div', { 'data-row-actions': '' })
const wrap = makeEl('span')
const img = makeEl('img', { 'data-profile-avatar': 'default' })
img.style.width = '1.25rem'; img.style.height = '1.25rem'
wrap.appendChild(img); actions.appendChild(wrap)
const row = makeEl('div'); row.appendChild(actions)

const r1 = fn(row, actions)
console.log('caso canônico (espera true):', r1)

// Caso 2: img com tamanho errado -> FALSE (precisa corrigir)
const actions2 = makeEl('div', { 'data-row-actions': '' })
const wrap2 = makeEl('span')
const img2 = makeEl('img', { 'data-profile-avatar': 'default' })
img2.style.width = '0.875rem'; img2.style.height = '0.875rem'
wrap2.appendChild(img2); actions2.appendChild(wrap2)
const row2 = makeEl('div'); row2.appendChild(actions2)

const r2 = fn(row2, actions2)
console.log('tamanho errado (espera false):', r2)

// Caso 3: img direto no actions sem span -> FALSE
const actions3 = makeEl('div', { 'data-row-actions': '' })
const img3 = makeEl('img', { 'data-profile-avatar': 'default' })
img3.style.width = '1.25rem'; img3.style.height = '1.25rem'
actions3.appendChild(img3)
const row3 = makeEl('div'); row3.appendChild(actions3)

const r3 = fn(row3, actions3)
console.log('sem wrapper (espera false):', r3)

const ok = r1 === true && r2 === false && r3 === false
console.log(ok ? '\n✓ IDEMPOTÊNCIA OK — plugin não mexe em estrutura correta (sem loop)' : '\n✗ LÓGICA ERRADA')
process.exit(ok ? 0 : 1)
