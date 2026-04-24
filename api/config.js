export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const supabaseUrl     = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return res.status(500).json({ error: 'Supabase config missing' });
  res.setHeader('Cache-Control', 'no-store');
  res.json({ supabaseUrl, supabaseAnonKey });
}
