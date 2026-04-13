/**
 * GET /api/catalogs
 * Proxies Google Drive API to list supplier subfolders and their PDF catalogs.
 * Requires GOOGLE_API_KEY env variable (free API key, no OAuth needed for public folders).
 *
 * Drive folder: https://drive.google.com/drive/folders/1KZf-IdEfWZ_ohmN2vjH1h2_FtjW4IKGO
 * Structure:    <root>/<Supplier Folder>/<catalog.pdf>
 *
 * Returns: { suppliers: [{ name, id, files: [{ id, name, thumbnail, url }] }] }
 */

const ROOT_FOLDER_ID = '1KZf-IdEfWZ_ohmN2vjH1h2_FtjW4IKGO';
const DRIVE_BASE = 'https://www.googleapis.com/drive/v3/files';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const API_KEY = process.env.GOOGLE_API_KEY;
  if (!API_KEY) {
    console.error('GOOGLE_API_KEY not configured');
    return res.status(500).json({ error: 'GOOGLE_API_KEY non configurata' });
  }

  try {
    // 1. List supplier subfolders in root
    const subfolders = await driveList(API_KEY, {
      q: `'${ROOT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id,name)',
      orderBy: 'name'
    });

    // 2. For each subfolder, list PDF files (parallel)
    const suppliers = await Promise.all(subfolders.map(async folder => {
      const files = await driveList(API_KEY, {
        q: `'${folder.id}' in parents and mimeType='application/pdf' and trashed=false`,
        fields: 'files(id,name)',
        orderBy: 'name'
      });
      return {
        name: folder.name,
        id: folder.id,
        files: files.map(f => ({
          id: f.id,
          name: f.name.replace(/\.pdf$/i, ''),
          // Public thumbnail — works for files shared with "anyone with the link"
          thumbnail: `https://drive.google.com/thumbnail?id=${f.id}&sz=w400`,
          url: `https://drive.google.com/file/d/${f.id}/view`
        }))
      };
    }));

    // Cache for 5 min on Vercel Edge, serve stale while revalidating
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ suppliers });

  } catch (e) {
    console.error('Drive API error:', e);
    return res.status(500).json({ error: e.message || 'Errore Drive API' });
  }
};

async function driveList(apiKey, params) {
  const url = new URL(DRIVE_BASE);
  url.searchParams.set('key', apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive API ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.files || [];
}
