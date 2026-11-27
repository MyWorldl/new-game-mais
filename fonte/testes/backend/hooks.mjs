// Gancho de resolução do Node: troca "npm:@supabase/supabase-js@2" (especificador do Deno) pelo dublê local.
export async function resolve(especificador, contexto, proximo) {
  if (especificador === 'npm:@supabase/supabase-js@2') return { url: new URL('./supabase-dubla.mjs', import.meta.url).href, shortCircuit: true };
  return proximo(especificador, contexto);
}
