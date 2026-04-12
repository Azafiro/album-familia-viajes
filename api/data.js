const OWNER = 'Azafiro';
const REPO = 'album-familia-viajes';
const FILE_PATH = 'data.json';
const BRANCH = 'master';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

function makeHeaders() {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json'
  };
}

async function getFile() {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(FILE_PATH)}?ref=${BRANCH}`;
  const response = await fetch(url, { headers: makeHeaders() });
  if (response.status === 404) {
    return { exists: false };
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub read failed: ${response.status} ${text}`);
  }
  const responseText = await response.text();
  if (!responseText) {
    throw new Error('GitHub returned empty response body.');
  }
  let data;
  try {
    data = JSON.parse(responseText);
  } catch (error) {
    throw new Error(`GitHub JSON parse failed: ${error.message}. Raw response: ${responseText.slice(0, 500)}`);
  }

  let fileText = '';
  if (typeof data.content === 'string' && data.content.length > 0) {
    if (data.encoding === 'base64') {
      fileText = Buffer.from(data.content, 'base64').toString('utf8');
    } else {
      fileText = data.content;
    }
  } else if (data.download_url) {
    const rawResponse = await fetch(data.download_url);
    if (!rawResponse.ok) {
      throw new Error(`GitHub download_url failed: ${rawResponse.status}`);
    }
    fileText = await rawResponse.text();
  }

  if (!fileText || !fileText.trim()) {
    return { exists: false };
  }
  let content;
  try {
    content = JSON.parse(fileText);
  } catch (error) {
    throw new Error(`Stored data parse failed: ${error.message}. File content: ${fileText.slice(0, 500)}`);
  }
  return { exists: true, content, sha: data.sha };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GitHub token is not configured.' });
  }

  if (req.method === 'GET') {
    try {
      const file = await getFile();
      if (!file.exists) {
        return res.status(200).json({ data: { users: {} } });
      }
      return res.status(200).json({ data: file.content });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const file = await getFile();
      const content = Buffer.from(JSON.stringify(body, null, 2)).toString('base64');
      const payload = {
        message: 'Sync album data from cloud',
        content,
        branch: BRANCH
      };
      if (file.exists) {
        payload.sha = file.sha;
      }
      const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(FILE_PATH)}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: makeHeaders(),
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: result.message || 'GitHub write failed.' });
      }
      return res.status(200).json({ ok: true, sha: result.content.sha });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed.' });
}
