const SUPABASE_BASE = 'https://kfifgbqkykyvnrirxwze.supabase.co/functions/v1';
const MCP_URL = `${SUPABASE_BASE}/mcp`;
const PARSE_FOOD_URL = `${SUPABASE_BASE}/parse-food-text`;
const ANALYZE_FOOD_URL = `${SUPABASE_BASE}/analyze-food`;

const $ = (id) => document.getElementById(id);
const state = { token: null, photoDataUrl: null, busy: false };

function todayLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function feedback(message, kind = '') {
  const el = $('feedback');
  el.textContent = message;
  el.className = `feedback${kind ? ` ${kind}` : ''}`;
}

function clearFeedback() {
  $('feedback').className = 'feedback hidden';
  $('feedback').textContent = '';
}

function setBusy(busy) {
  state.busy = busy;
  $('logFood').disabled = busy;
  $('logWater').disabled = busy;
  $('refreshButton').disabled = busy;
  document.querySelectorAll('.water-button').forEach((b) => { b.disabled = busy; });
}

function parseRpcPayload(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed);
  const events = trimmed.split(/\n\n+/);
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const dataLines = events[i].split('\n').filter((line) => line.startsWith('data:'));
    if (!dataLines.length) continue;
    const data = dataLines.map((line) => line.slice(5).trim()).join('');
    if (data && data !== '[DONE]') return JSON.parse(data);
  }
  throw new Error('Unexpected MCP response');
}

async function postMcp(body, sessionId = null) {
  if (!state.token) throw new Error('Open RepTrack and sign in first.');
  const headers = {
    Authorization: `Bearer ${state.token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'MCP-Protocol-Version': '2025-03-26',
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;
  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (response.status === 401) {
    await chrome.storage.local.remove(['reptrackAccessToken', 'reptrackAuthCapturedAt']);
    state.token = null;
    throw new Error('RepTrack session expired. Open the app and sign in again.');
  }
  if (!response.ok) throw new Error(`RepTrack MCP request failed (${response.status}).`);
  return {
    payload: parseRpcPayload(await response.text()),
    sessionId: response.headers.get('mcp-session-id') || sessionId,
  };
}

async function callTool(name, args) {
  const init = await postMcp({
    jsonrpc: '2.0',
    id: crypto.randomUUID(),
    method: 'initialize',
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'reptrack-chrome-extension', version: '0.1.0' },
    },
  });
  const sessionId = init.sessionId;
  await postMcp({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }, sessionId);
  const result = await postMcp({
    jsonrpc: '2.0',
    id: crypto.randomUUID(),
    method: 'tools/call',
    params: { name, arguments: args },
  }, sessionId);
  const rpc = result.payload;
  if (rpc?.error) throw new Error(rpc.error.message || 'RepTrack tool failed.');
  const structured = rpc?.result?.structuredContent;
  if (structured) return structured;
  const text = rpc?.result?.content?.find?.((item) => item.type === 'text')?.text;
  if (text) {
    try { return JSON.parse(text); } catch { return { data: text }; }
  }
  return rpc?.result ?? null;
}

async function authenticatedJson(url, body) {
  if (!state.token) throw new Error('Open RepTrack and sign in first.');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${state.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) throw new Error('RepTrack session expired. Open the app and sign in again.');
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status}).`);
  return data;
}

function mealPayload(parsed, mealType, sourceText) {
  const foods = Array.isArray(parsed.foods) ? parsed.foods : [];
  const name = parsed.description || foods.map((f) => f.name).filter(Boolean).join(', ') || sourceText || 'Meal';
  return {
    date: todayLocal(),
    meal_type: mealType,
    food_name: name.slice(0, 200),
    calories: Number(parsed.total_calories ?? 0),
    protein: Number(parsed.total_protein ?? foods.reduce((n, f) => n + Number(f.protein || 0), 0)),
    carbs: Number(parsed.total_carbs ?? foods.reduce((n, f) => n + Number(f.carbs || 0), 0)),
    fat: Number(parsed.total_fat ?? foods.reduce((n, f) => n + Number(f.fat || 0), 0)),
    fiber: Number(parsed.total_fiber ?? foods.reduce((n, f) => n + Number(f.fiber || 0), 0)),
    sugar: Number(parsed.total_sugar ?? foods.reduce((n, f) => n + Number(f.sugar || 0), 0)),
    sodium: Number(parsed.total_sodium ?? foods.reduce((n, f) => n + Number(f.sodium || 0), 0)),
    potassium: Number(parsed.total_potassium ?? foods.reduce((n, f) => n + Number(f.potassium || 0), 0)),
    caffeine: Number(parsed.total_caffeine ?? foods.reduce((n, f) => n + Number(f.caffeine || 0), 0)),
    notes: parsed.confidence != null ? `Quick Log estimate. Confidence ${Math.round(Number(parsed.confidence) * 100)}%.` : 'Quick Log estimate.',
    client_key: `chrome-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
  };
}

async function refreshTotals() {
  if (!state.token) {
    $('caloriesValue').textContent = '—';
    $('proteinValue').textContent = '—';
    $('waterValue').textContent = '—';
    $('statusLine').textContent = 'Open RepTrack to connect';
    return;
  }
  try {
    const date = todayLocal();
    const result = await callTool('get_nutrition', { start_date: date, end_date: date, limit: 1 });
    const today = Array.isArray(result?.data) ? result.data[0] : null;
    $('caloriesValue').textContent = `${Math.round(Number(today?.calories || 0))}`;
    $('proteinValue').textContent = `${Math.round(Number(today?.protein || 0))} g`;
    $('waterValue').textContent = `${Number(today?.water_l || 0).toFixed(1)} L`;
    $('statusLine').textContent = 'Today';
  } catch (error) {
    $('statusLine').textContent = 'Connection issue';
    feedback(error.message, 'error');
  }
}

async function logFood() {
  if (state.busy) return;
  const text = $('foodInput').value.trim();
  if (!text && !state.photoDataUrl) {
    feedback('Describe the food or attach a photo.', 'error');
    return;
  }
  setBusy(true);
  clearFeedback();
  $('logFood').textContent = 'Analyzing…';
  try {
    const parsed = state.photoDataUrl
      ? await authenticatedJson(ANALYZE_FOOD_URL, { imageUrl: state.photoDataUrl, context: text || undefined })
      : await authenticatedJson(PARSE_FOOD_URL, { text });
    $('logFood').textContent = 'Logging…';
    const payload = mealPayload(parsed, $('mealType').value, text);
    await callTool('log_meal', payload);
    feedback(`Logged ${Math.round(payload.calories)} kcal · ${Math.round(payload.protein || 0)} g protein`, 'success');
    $('foodInput').value = '';
    state.photoDataUrl = null;
    $('foodPhoto').value = '';
    $('photoChip').classList.add('hidden');
    await refreshTotals();
  } catch (error) {
    feedback(error.message, 'error');
  } finally {
    $('logFood').textContent = 'Log food';
    setBusy(false);
  }
}

async function logWater(amount) {
  if (state.busy) return;
  const ml = Number(amount);
  if (!Number.isFinite(ml) || ml < 50 || ml > 10000) {
    feedback('Enter water between 50 and 10,000 ml.', 'error');
    return;
  }
  setBusy(true);
  clearFeedback();
  try {
    await callTool('log_water', { date: todayLocal(), milliliters: ml });
    feedback(`Logged ${ml} ml water`, 'success');
    $('waterInput').value = '';
    await refreshTotals();
  } catch (error) {
    feedback(error.message, 'error');
  } finally {
    setBusy(false);
  }
}

function selectTab(tab) {
  const food = tab === 'food';
  $('foodTab').classList.toggle('active', food);
  $('waterTab').classList.toggle('active', !food);
  $('foodPanel').classList.toggle('hidden', !food);
  $('waterPanel').classList.toggle('hidden', food);
}

async function loadToken() {
  const stored = await chrome.storage.local.get(['reptrackAccessToken']);
  state.token = stored.reptrackAccessToken || null;
}

$('foodTab').addEventListener('click', () => selectTab('food'));
$('waterTab').addEventListener('click', () => selectTab('water'));
$('logFood').addEventListener('click', logFood);
$('logWater').addEventListener('click', () => logWater($('waterInput').value));
$('refreshButton').addEventListener('click', refreshTotals);
document.querySelectorAll('.water-button').forEach((button) => button.addEventListener('click', () => logWater(button.dataset.ml)));
$('foodInput').addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') logFood();
});
$('foodPhoto').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    feedback('Photo must be under 8 MB.', 'error');
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    state.photoDataUrl = String(reader.result || '');
    $('photoName').textContent = file.name;
    $('photoChip').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
});
$('clearPhoto').addEventListener('click', () => {
  state.photoDataUrl = null;
  $('foodPhoto').value = '';
  $('photoChip').classList.add('hidden');
});

(async function init() {
  await loadToken();
  await refreshTotals();
})();
