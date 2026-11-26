// Carrega uma Edge Function (index.ts, escrita para o Deno) dentro do Node, sem rede e sem o Supabase real:
//  - Deno.env / Deno.serve são simulados; o handler registrado por Deno.serve é devolvido;
//  - createClient (npm:@supabase/supabase-js@2) é trocado, pelo gancho, por um banco de mentira que grava as chamadas.
// Assim dá para testar validação, permissões, limites e o que a função grava, sem depender do projeto real.
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export const ENV = {};
let handler = null;
globalThis.Deno = { env: { get: (k) => (k in ENV ? ENV[k] : undefined) }, serve: (h) => { handler = h; return {}; } };

let n = 0;
export async function carrega(funcao, env = {}) {
  for (const k of Object.keys(ENV)) delete ENV[k];
  Object.assign(ENV, { SUPABASE_URL: 'https://exemplo.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'chave-de-teste' }, env);
  handler = null;
  const arq = path.resolve(import.meta.dirname, '../../supabase/functions', funcao, 'index.ts');
  await import(pathToFileURL(arq).href + '?t=' + (++n));
  if (!handler) throw new Error('a função não chamou Deno.serve');
  return handler;
}

// Banco de mentira. `regras` decide o que cada operação devolve; `calls` guarda tudo o que a função chamou.
//  regras.from(tabela, ops) -> {data?, error?, count?}   (ops = [['select','id'],['eq','email','x'],['maybeSingle'], ...])
//  regras.rpc(nome, args) -> {data?, error?}
//  regras.getUser(token) -> {data:{user}, error}
//  regras.admin.{createUser,inviteUserByEmail,deleteUser}(...) -> {error?}
//  regras.storage.list(pasta) / remove(lista) -> {data?, error?}
export function bancoDeMentira(regras = {}) {
  const calls = [];
  const rec = (tipo, detalhe) => calls.push({ tipo, ...detalhe });
  class Consulta {
    constructor(tabela) { this.tabela = tabela; this.ops = []; }
    _op(nome, ...args) { this.ops.push([nome, ...args]); return this; }
    select(...a) { return this._op('select', ...a); } insert(...a) { return this._op('insert', ...a); } update(...a) { return this._op('update', ...a); } delete(...a) { return this._op('delete', ...a); }
    eq(...a) { return this._op('eq', ...a); } neq(...a) { return this._op('neq', ...a); } lt(...a) { return this._op('lt', ...a); } gte(...a) { return this._op('gte', ...a); }
    order(...a) { return this._op('order', ...a); } limit(...a) { return this._op('limit', ...a); } maybeSingle() { return this._op('maybeSingle'); }
    then(res, rej) {
      rec('from', { tabela: this.tabela, ops: this.ops });
      const r = regras.from ? regras.from(this.tabela, this.ops) : {};
      return Promise.resolve({ data: null, error: null, count: null, ...r }).then(res, rej);
    }
  }
  const banco = {
    calls,
    from: (t) => new Consulta(t),
    rpc: async (nome, args) => { rec('rpc', { nome, args }); return { data: null, error: null, ...(regras.rpc ? regras.rpc(nome, args) : {}) }; },
    auth: {
      getUser: async (token) => { rec('getUser', { token }); return regras.getUser ? regras.getUser(token) : { data: { user: null }, error: { message: 'sem regra' } }; },
      admin: {
        createUser: async (a) => { rec('createUser', { a }); return { error: null, ...(regras.admin?.createUser ? regras.admin.createUser(a) : {}) }; },
        inviteUserByEmail: async (e, o) => { rec('inviteUserByEmail', { e, o }); return { error: null, ...(regras.admin?.inviteUserByEmail ? regras.admin.inviteUserByEmail(e, o) : {}) }; },
        deleteUser: async (id) => { rec('deleteUser', { id }); return { error: null, ...(regras.admin?.deleteUser ? regras.admin.deleteUser(id) : {}) }; },
      },
    },
    storage: { from: (bucket) => ({
      list: async (pasta, o) => { rec('storage.list', { bucket, pasta }); return { data: [], error: null, ...(regras.storage?.list ? regras.storage.list(pasta) : {}) }; },
      remove: async (l) => { rec('storage.remove', { bucket, l }); return { error: null, ...(regras.storage?.remove ? regras.storage.remove(l) : {}) }; },
    }) },
  };
  globalThis.__banco = banco;
  return banco;
}

export const req = (corpo, { metodo = 'POST', headers = {}, bruto } = {}) => new Request('https://exemplo.supabase.co/functions/v1/x', { method: metodo, headers: { 'Content-Type': 'application/json', ...headers }, ...(metodo === 'GET' || metodo === 'OPTIONS' ? {} : { body: bruto !== undefined ? bruto : JSON.stringify(corpo) }) });
export const lê = async (r) => { let j = null; try { j = await r.clone().json(); } catch { } return { status: r.status, j, h: r.headers }; };
export function placar() {
  let ok = 0, bad = 0;
  const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
  const fim = () => { console.log(`\n${ok} ok / ${bad} falhas`); process.exit(bad ? 1 : 0); };
  return { t, fim };
}
