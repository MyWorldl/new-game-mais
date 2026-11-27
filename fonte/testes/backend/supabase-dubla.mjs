// Dublê do @supabase/supabase-js: createClient devolve o "banco de mentira" montado pelo teste (globalThis.__banco).
export function createClient() { return globalThis.__banco; }
