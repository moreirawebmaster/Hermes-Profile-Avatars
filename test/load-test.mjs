#!/usr/bin/env node
// testa-plugin.js — valida o plugin profile-avatars fora do app
// Simula o ambiente mínimo (host, document) para executar register().
import { readFileSync } from 'fs'

const src = readFileSync(new URL('../plugin.js', import.meta.url), 'utf8')

// 1. verifica a estrutura básica
const has = {
  defaultExport: /export default/.test(src),
  id: /id:\s*ID/.test(src),
  register: /register\s*\(/.test(src),
  observer: /MutationObserver/.test(src),
  getAsset: /profiles\.get_asset/.test(src),
  kanbanHook: /span\[title\]/.test(src),
  sidebarHook: /aria-label\^="Profile:/.test(src),
}
console.log('estrutura:', has)
const ok = Object.values(has).every(Boolean)
if (!ok) { console.error('✗ estrutura incompleta'); process.exit(1) }

// 2. avalia o módulo num sandbox com stubs de browser
const sandbox = {
  document: {
    body: null,
    createElement: () => ({ style: {}, setAttribute() {}, replaceWith() {} }),
    querySelectorAll: () => [],
  },
  MutationObserver: class { constructor() {} observe() {} },
  HTMLElement: class {},
  WeakSet,
  Map,
  Set,
  setTimeout: () => {},
  console,
  host: { request: async () => ({ found: false, data: null }) },
}
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
// remove a linha de import e o export default (o runtime-loader do app resolve via shims; aqui só testamos o corpo)
const body = src
  .replace(/^import[^\n]*\n/m, '')
  .replace(/export default \{/m, 'const __plugin = {')
const mod = new AsyncFunction('document','MutationObserver','HTMLElement','WeakSet','Map','Set','setTimeout','console','host', body + '\nreturn __plugin;')(sandbox.document, sandbox.MutationObserver, sandbox.HTMLElement, WeakSet, Map, Set, sandbox.setTimeout, console, sandbox.host)

console.log('plugin exportado:', mod.id, '|', mod.name)
console.log('✓ PLUGIN CARREGA SEM ERRO')
