// Lee la configuración de Supabase aceptando los nombres que crea la integración
// Supabase ↔ Vercel (incluidos los prefijos NEXT_PUBLIC_ y las claves nuevas).
const first = (...names) => names.map((n) => process.env[n]).find((v) => v) || '';

export const supabaseUrl = () => first('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
export const supabaseAnonKey = () =>
  first('SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
export const supabaseServiceKey = () => first('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY');
