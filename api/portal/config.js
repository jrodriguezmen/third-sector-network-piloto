// Configuración pública del portal para el navegador (la clave "anon" de Supabase es pública por diseño;
// la seguridad la ponen las reglas RLS de la base de datos).
import { COMMISSION_PCT } from '../../lib/portal/contract.js';
import { supabaseUrl, supabaseAnonKey } from '../../lib/portal/env.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({
    supabaseUrl: supabaseUrl(),
    supabaseAnonKey: supabaseAnonKey(),
    comisionPct: COMMISSION_PCT,
  });
}
