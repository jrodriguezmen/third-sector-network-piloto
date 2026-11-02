// Configuración pública del portal para el navegador (la clave "anon" de Supabase es pública por diseño;
// la seguridad la ponen las reglas RLS de la base de datos).
import { COMMISSION_PCT } from '../../lib/portal/contract.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    comisionPct: COMMISSION_PCT,
  });
}
