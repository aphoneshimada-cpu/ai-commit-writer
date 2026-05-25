const MIMO_API_KEY = process.env.MIMO_API_KEY;
const MIMO_API_URL = process.env.MIMO_API_URL || 'https://api.xiaomimimo.com';

const isApiKeyValid = MIMO_API_KEY && MIMO_API_KEY.length > 10 && !MIMO_API_KEY.includes('your_');

const SYSTEM_PROMPT = `You are an expert git commit message writer. You write conventional commit messages following the Conventional Commits 1.0.0 spec.

Rules:
- Format: <type>(<optional scope>): <subject>
- Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- Subject: imperative mood ("add" not "added"), no period, lowercase first letter, max 72 chars
- Body (optional): wrap at 72 chars, explain WHAT and WHY (not HOW), separated from subject by blank line
- Footer (optional): "BREAKING CHANGE: ..." or "Refs: #123"

Output exactly 3 candidates ranked best to worst. Format STRICTLY as:

[1] <full message including body if needed>
---
[2] <full message>
---
[3] <full message>

No commentary outside the candidates. No markdown. No quotes around messages.`;

function buildPrompt(diff, style, scope) {
  const styleHint = style === 'short' ? ' Keep all candidates to single-line subjects only, no body.'
    : style === 'verbose' ? ' Include a 1-3 line body explaining the why for each candidate.'
    : '';
  const scopeHint = scope ? ` Use "${scope}" as the scope when relevant.` : '';

  return `Generate 3 conventional commit messages for this diff.${styleHint}${scopeHint}

\`\`\`diff
${diff}
\`\`\``;
}

async function callMIMO(diff, style, scope) {
  const prompt = buildPrompt(diff, style, scope);

  const res = await fetch(`${MIMO_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MIMO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mimo-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 600,
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`MiMo ${res.status}: ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

function parseCandidates(text) {
  const cleaned = text.trim();
  const parts = cleaned.split(/^\s*---\s*$/m).map((p) => p.trim()).filter(Boolean);

  return parts.map((p) => {
    const m = p.match(/^\[\d+\]\s*([\s\S]*)$/);
    return (m ? m[1] : p).trim();
  }).filter(Boolean).slice(0, 3);
}

function demoCandidates(diff, style, scope) {
  const lines = diff.split('\n');
  const added = lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).length;
  const removed = lines.filter(l => l.startsWith('-') && !l.startsWith('---')).length;
  const fileMatch = diff.match(/^\+\+\+\s+b?\/?(.+)$/m) || diff.match(/^---\s+a?\/?(.+)$/m);
  const file = fileMatch ? fileMatch[1].split('/').pop() : null;
  const ext = file && file.includes('.') ? file.split('.').pop() : '';

  let type = 'chore';
  const text = diff.toLowerCase();
  if (/test|spec|\.test\.|\.spec\./.test(text)) type = 'test';
  else if (/fix|bug|error|exception|null|undefined|crash/.test(text)) type = 'fix';
  else if (/readme|\.md|docs?\//.test(text)) type = 'docs';
  else if (/import|export|class|function|const|interface|type/.test(text) && added > removed) type = 'feat';
  else if (added > 0 && removed > 0) type = 'refactor';
  else if (/css|style|tailwind|color|padding|margin/.test(text)) type = 'style';
  else if (/package\.json|lock|yarn|npm/.test(text)) type = 'build';
  else if (/\.yml|\.yaml|workflow|action/.test(text)) type = 'ci';

  const scopeStr = scope ? `(${scope})` : (file ? `(${file.replace(/\.[^.]+$/, '').slice(0, 20)})` : '');

  const subjects = {
    feat: ['add new functionality', 'introduce new module', 'implement requested feature'],
    fix: ['resolve unexpected behavior', 'correct edge case handling', 'fix logic in update path'],
    refactor: ['simplify implementation', 'reorganize code for clarity', 'extract helper functions'],
    docs: ['update project documentation', 'clarify usage instructions', 'expand API reference'],
    style: ['adjust formatting', 'tweak visual styling', 'apply consistent indentation'],
    test: ['add coverage for new path', 'expand edge case tests', 'cover failure scenarios'],
    build: ['update dependencies', 'bump package versions', 'adjust build config'],
    ci: ['update workflow config', 'add new pipeline step', 'tweak deploy config'],
    chore: ['routine cleanup', 'minor housekeeping', 'misc updates'],
  };

  const list = subjects[type] || subjects.chore;
  const out = list.map((s) => `${type}${scopeStr}: ${s}`);

  if (style === 'verbose') {
    out[0] += `\n\nChange spans ${added} added / ${removed} removed lines${file ? ` in ${file}` : ''}.\nReview the diff for the full context behind this change.`;
  }

  return out;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { diff, style, scope } = req.body || {};
  if (!diff || typeof diff !== 'string' || diff.trim().length < 10) {
    return res.status(400).json({ error: 'diff is required (min 10 chars)' });
  }
  if (diff.length > 12000) {
    return res.status(400).json({ error: 'diff too large (max 12000 chars)' });
  }
  if (style && !['short', 'normal', 'verbose'].includes(style)) {
    return res.status(400).json({ error: 'style must be short | normal | verbose' });
  }
  if (scope && (typeof scope !== 'string' || scope.length > 30 || !/^[a-z0-9-]+$/i.test(scope))) {
    return res.status(400).json({ error: 'scope must be alphanumeric, max 30 chars' });
  }

  try {
    if (!isApiKeyValid) {
      return res.status(200).json({
        candidates: demoCandidates(diff, style, scope),
        mode: 'demo',
        powered_by: 'Xiaomi MiMo',
      });
    }

    const raw = await callMIMO(diff, style || 'normal', scope);
    const candidates = parseCandidates(raw);

    if (candidates.length === 0) {
      return res.status(200).json({
        candidates: demoCandidates(diff, style, scope),
        mode: 'demo',
        warning: 'AI response unparseable, used fallback',
        powered_by: 'Xiaomi MiMo',
      });
    }

    res.status(200).json({
      candidates,
      mode: 'mimo',
      powered_by: 'Xiaomi MiMo',
    });
  } catch (err) {
    console.error('Commit gen error:', err.message);
    res.status(200).json({
      candidates: demoCandidates(diff, style, scope),
      mode: 'demo',
      warning: 'AI temporarily unavailable, used fallback',
      powered_by: 'Xiaomi MiMo',
    });
  }
};
