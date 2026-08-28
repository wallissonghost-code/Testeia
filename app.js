const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');
const form = document.getElementById('commandForm');
const input = document.getElementById('commandInput');
const historyEl = document.getElementById('history');
const statusEl = document.getElementById('status');
const winnerEl = document.getElementById('winner');
const clearBtn = document.getElementById('clearBtn');

const scene = {
  objects: [],
  nextId: 1,
  race: null,
  lastCreatedIds: [],
  lastWinnerId: null,
  lastSelectionIds: [],
  commandHistory: [],
  collisionRules: []
};

const AI_ENDPOINT = window.TESTEIA_AI_ENDPOINT || '/api/interpret';

const COLORS = {
  vermelho:'#ff4d5a', red:'#ff4d5a',
  azul:'#4d8dff', blue:'#4d8dff',
  verde:'#38d996', green:'#38d996',
  amarelo:'#ffd84d', yellow:'#ffd84d',
  roxo:'#a56cff', purple:'#a56cff',
  rosa:'#ff69b4', pink:'#ff69b4',
  branco:'#f4f7fb', white:'#f4f7fb',
  preto:'#111318', black:'#111318',
  laranja:'#ff9c42', orange:'#ff9c42'
};

const COLOR_WORDS = [
  ['vermelh', '#ff4d5a'], ['azul', '#4d8dff'], ['verde', '#38d996'],
  ['amarel', '#ffd84d'], ['rox', '#a56cff'], ['rosa', '#ff69b4'],
  ['branc', '#f4f7fb'], ['pret', '#111318'], ['laranj', '#ff9c42']
];

const NUMBERS = {
  um:1, uma:1, dois:2, duas:2, tres:3, três:3, quatro:4, cinco:5,
  seis:6, sete:7, oito:8, nove:9, dez:10, onze:11, doze:12,
  treze:13, quatorze:14, catorze:14, quinze:15, dezesseis:16,
  dezessete:17, dezoito:18, dezenove:19, vinte:20
};

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function normalize(text) {
  return text.toLowerCase().trim().replace(/[!?.,;:]/g, ' ').replace(/\s+/g, ' ');
}

function extractNumber(text, fallback = 1) {
  const digit = text.match(/\b(\d{1,3})\b/);
  if (digit) return Math.max(1, Math.min(Number(digit[1]), 100));
  for (const [word, value] of Object.entries(NUMBERS)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) return value;
  }
  return fallback;
}

function colorToHex(value) {
  if (!value) return null;
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  const key = String(value).toLowerCase().trim();
  return COLORS[key] || null;
}

function extractColor(text) {
  for (const [part, hex] of COLOR_WORDS) if (text.includes(part)) return hex;
  return null;
}

function randomColor() {
  const list = ['#4d8dff','#ff4d5a','#38d996','#ffd84d','#a56cff','#ff9c42','#ff69b4'];
  return list[Math.floor(Math.random() * list.length)];
}

function snapshotScene() {
  return {
    objects: scene.objects.map(o => ({
      id:o.id, type:o.type, color:o.color, group:o.group || null,
      x:Math.round(o.x), y:Math.round(o.y), radius:o.radius
    })),
    lastCreatedIds:[...scene.lastCreatedIds],
    lastWinnerId:scene.lastWinnerId,
    raceActive:!!scene.race?.active,
    recentCommands:scene.commandHistory.slice(-8)
  };
}

function positionFor(direction = 'center', index = 0, total = 1) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  let x = w / 2, y = h / 2;
  if (direction === 'left') x = 75;
  if (direction === 'right') x = w - 75;
  if (direction === 'top') y = 75;
  if (direction === 'bottom') y = h - 75;
  const spread = Math.min(52, Math.max(30, h / Math.max(total + 1, 2)));
  if (direction === 'left' || direction === 'right') {
    y = h / 2 + (index - (total - 1) / 2) * spread;
  } else {
    x = w / 2 + (index - (total - 1) / 2) * spread;
  }
  return {
    x:Math.max(24, Math.min(w - 24, x)),
    y:Math.max(24, Math.min(h - 24, y))
  };
}

function spawnPoints(count = 1, color = null, group = null, direction = 'center') {
  const ids = [];
  const finalColor = colorToHex(color) || color || null;
  for (let i = 0; i < count; i++) {
    const id = scene.nextId++;
    const pos = positionFor(direction || 'center', i, count);
    scene.objects.push({
      id, type:'point', x:pos.x, y:pos.y, radius:14,
      color:finalColor || randomColor(), group:group || null,
      vx:0, vy:0, label:String(id), racing:false, finished:false,
      speedMultiplier:1, behavior:null
    });
    ids.push(id);
  }
  scene.lastCreatedIds = ids;
  scene.lastSelectionIds = ids;
  return ids;
}

function matchesSelector(o, selector) {
  if (!selector || selector === 'all') return true;
  if (selector === 'winner') return o.id === scene.lastWinnerId;
  if (selector === 'last-created') return scene.lastCreatedIds.includes(o.id);
  if (selector === 'selection') return scene.lastSelectionIds.includes(o.id);
  if (selector.startsWith('ordinal:')) {
    const n = Number(selector.split(':')[1]);
    return scene.objects[n - 1]?.id === o.id;
  }
  if (selector.startsWith('id:')) return o.id === Number(selector.split(':')[1]);
  if (selector.startsWith('group:')) {
    return String(o.group || '').toLowerCase() === selector.slice(6).toLowerCase();
  }
  if (selector.startsWith('color:')) {
    const raw = selector.slice(6);
    const hex = colorToHex(raw) || raw;
    return String(o.color).toLowerCase() === String(hex).toLowerCase();
  }
  return false;
}

function resolveTargets(target = 'last-created', ordinal = null) {
  if (!scene.objects.length) return [];
  if (ordinal != null) return scene.objects[ordinal - 1] ? [scene.objects[ordinal - 1]] : [];
  return scene.objects.filter(o => matchesSelector(o, target));
}

function startRace(targets) {
  const racers = (targets?.length ? targets : scene.objects).filter(o => o.type === 'point');
  if (racers.length < 2) {
    say('Preciso de pelo menos 2 pontos para uma corrida.');
    return false;
  }
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const startX = 45;
  const finishX = Math.max(120, w - 55);
  const usableH = Math.max(120, h - 100);
  racers.forEach((o, i) => {
    o.x = startX;
    o.y = 55 + (usableH / racers.length) * (i + 0.5);
    o.vx = 65 + Math.random() * 65;
    o.vy = 0;
    o.racing = true;
    o.finished = false;
    o.behavior = null;
  });
  scene.race = { active:true, finishX, finishers:[], racerIds:racers.map(o => o.id) };
  scene.lastWinnerId = null;
  winnerEl.hidden = true;
  return true;
}

function executeAction(action) {
  if (!action || typeof action !== 'object') return false;
  const type = action.type;

  if (type === 'spawn') {
    const count = Math.max(1, Math.min(Number(action.count || 1), 100));
    spawnPoints(count, action.color, action.group, action.direction || 'center');
    say(`${count} ponto${count > 1 ? 's criados' : ' criado'}${action.group ? ` no grupo ${action.group}` : ''}.`);
    return true;
  }

  const target = action.target || 'last-created';
  const ordinal = action.ordinal || (target.startsWith?.('ordinal:') ? Number(target.split(':')[1]) : null);
  const targets = resolveTargets(target, ordinal);

  if (type === 'color') {
    if (!targets.length) return false;
    targets.forEach(o => o.color = action.color === 'random' ? randomColor() : (colorToHex(action.color) || action.color || randomColor()));
    scene.lastSelectionIds = targets.map(o => o.id);
    say(`Cor alterada em ${targets.length} objeto${targets.length > 1 ? 's' : ''}.`);
    return true;
  }

  if (type === 'move') {
    if (!targets.length) return false;
    targets.forEach((o, i) => Object.assign(o, positionFor(action.direction || 'center', i, targets.length)));
    scene.lastSelectionIds = targets.map(o => o.id);
    say(`Movi ${targets.length} objeto${targets.length > 1 ? 's' : ''}.`);
    return true;
  }

  if (type === 'scale') {
    if (!targets.length) return false;
    const factor = Math.max(.1, Math.min(Number(action.factor || 1.8), 5));
    targets.forEach(o => o.radius = Math.max(5, Math.min(60, o.radius * factor)));
    scene.lastSelectionIds = targets.map(o => o.id);
    say('Tamanho alterado.');
    return true;
  }

  if (type === 'speed') {
    if (!targets.length) return false;
    const factor = Math.max(.1, Math.min(Number(action.factor || 1), 5));
    targets.forEach(o => o.speedMultiplier = factor);
    scene.lastSelectionIds = targets.map(o => o.id);
    say(`Velocidade definida para ${factor.toFixed(1)}x.`);
    return true;
  }

  if (type === 'race') {
    const racers = resolveTargets(action.target || 'all', action.ordinal || null);
    if (startRace(racers)) say(`Corrida iniciada com ${racers.length} competidores.`);
    return true;
  }

  if (type === 'chase') {
    if (!targets.length || !action.otherTarget) return false;
    targets.forEach(o => {
      o.racing = false;
      o.behavior = { type:'chase', targetSelector:action.otherTarget };
    });
    scene.lastSelectionIds = targets.map(o => o.id);
    say(`${targets.length} objeto${targets.length > 1 ? 's estão' : ' está'} perseguindo o alvo.`);
    return true;
  }

  if (type === 'stop') {
    if (!targets.length) return false;
    targets.forEach(o => { o.behavior = null; o.racing = false; o.vx = 0; o.vy = 0; });
    say('Movimento interrompido.');
    return true;
  }

  if (type === 'collision_rule') {
    if (!action.otherTarget) return false;
    scene.collisionRules.push({
      target,
      otherTarget:action.otherTarget,
      effectColor:action.effectColor || action.color || 'random',
      touched:new Set()
    });
    say('Regra de colisão criada.');
    return true;
  }

  if (type === 'remove') {
    if (target === 'all') { clearWorld(); return true; }
    if (!targets.length) return false;
    const ids = new Set(targets.map(o => o.id));
    scene.objects = scene.objects.filter(o => !ids.has(o.id));
    say(`${ids.size} objeto${ids.size !== 1 ? 's removidos' : ' removido'}.`);
    return true;
  }

  if (type === 'clear') {
    clearWorld();
    return true;
  }

  return false;
}

function localPlan(raw) {
  const text = normalize(raw);
  const actions = [];

  if (/apaga tudo|apague tudo|limpa tudo|limpe tudo|limpar mundo/.test(text)) return [{type:'clear'}];

  if (/(cria|crie|coloca|coloque|adiciona|adicione|apareca|apareça|gere|gera)/.test(text) &&
      /(ponto|bolinha|bola|circulo|círculo)/.test(text)) {
    actions.push({ type:'spawn', count:extractNumber(text,1), color:extractColor(text) });
  }

  if (/corrida|correr|corram|corra|disput/.test(text)) actions.push({type:'race', target:'all'});

  if (/persegue|persiga|seguir|siga/.test(text)) {
    const red = /vermelh/.test(text), blue = /azul/.test(text);
    if (red && blue) actions.push({type:'chase', target:'color:vermelho', otherTarget:'color:azul'});
  }

  if (/encost|colid|bater/.test(text) && /muda|troca/.test(text)) {
    const red = /vermelh/.test(text), blue = /azul/.test(text);
    actions.push({
      type:'collision_rule',
      target:red ? 'color:vermelho' : 'selection',
      otherTarget:blue ? 'color:azul' : 'all',
      effectColor:extractColor(text) || 'random'
    });
  }

  if (!actions.length) {
    const color = extractColor(text);
    if (color && /(deixa|deixe|fica|fique|pinta|pinte)/.test(text)) {
      const ordinal = /primeir/.test(text) ? 1 : /segund/.test(text) ? 2 : /terceir/.test(text) ? 3 : null;
      actions.push({type:'color', target:ordinal ? `ordinal:${ordinal}` : 'last-created', color});
    }
  }

  return actions;
}

function validateActions(actions) {
  const allowed = new Set(['spawn','color','move','scale','speed','race','remove','clear','chase','stop','collision_rule']);
  return (Array.isArray(actions) ? actions : [])
    .filter(a => a && allowed.has(a.type))
    .slice(0, 24);
}

async function remotePlan(command) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(AI_ENDPOINT, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({command, scene:snapshotScene()}),
      signal:controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const actions = validateActions(data.actions);
    return { actions, reply:data.reply || '' };
  } catch (error) {
    console.warn('TesteIA: IA remota indisponível; usando modo local.', error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function interpretAndExecute(raw) {
  const text = raw.trim();
  if (!text) return;
  log('Você', raw);
  scene.commandHistory.push(raw);
  scene.commandHistory = scene.commandHistory.slice(-20);
  statusEl.textContent = 'IA interpretando…';

  const remote = await remotePlan(raw);
  const actions = validateActions(remote?.actions?.length ? remote.actions : localPlan(raw));

  if (!actions.length) {
    say('Não consegui transformar esse pedido em uma ação ainda.');
    return;
  }

  let executed = 0;
  for (const action of actions) if (executeAction(action)) executed++;
  if (remote?.reply) log('IA', remote.reply);
  if (!executed) say('Entendi o pedido, mas não encontrei objetos compatíveis para executar.');
}

function updateRace(dt) {
  if (!scene.race?.active) return;
  const finishX = scene.race.finishX;
  const racers = scene.objects.filter(o => scene.race.racerIds.includes(o.id));
  for (const o of racers) {
    if (!o.racing || o.finished) continue;
    const wobble = Math.sin(performance.now() * .01 + o.id) * 8;
    o.x += (o.vx * (o.speedMultiplier || 1) + wobble) * dt;
    if (o.x >= finishX) {
      o.x = finishX;
      o.finished = true;
      o.racing = false;
      scene.race.finishers.push(o.id);
      if (!scene.lastWinnerId) {
        scene.lastWinnerId = o.id;
        scene.lastSelectionIds = [o.id];
        winnerEl.textContent = `🏆 Ponto ${o.id} venceu!`;
        winnerEl.hidden = false;
        say(`Ponto ${o.id} venceu a corrida!`);
      }
    }
  }
  if (scene.race.finishers.length === racers.length) scene.race.active = false;
}

function updateBehaviors(dt) {
  for (const o of scene.objects) {
    if (o.racing || o.behavior?.type !== 'chase') continue;
    const candidates = resolveTargets(o.behavior.targetSelector).filter(t => t.id !== o.id);
    if (!candidates.length) continue;
    let target = candidates[0], best = Infinity;
    for (const c of candidates) {
      const d = (c.x-o.x)**2 + (c.y-o.y)**2;
      if (d < best) { best = d; target = c; }
    }
    const dx = target.x - o.x, dy = target.y - o.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = 90 * (o.speedMultiplier || 1);
    if (dist > o.radius + target.radius) {
      o.x += dx / dist * speed * dt;
      o.y += dy / dist * speed * dt;
    }
  }
}

function updateCollisions() {
  for (const rule of scene.collisionRules) {
    const actors = resolveTargets(rule.target);
    const others = resolveTargets(rule.otherTarget);
    for (const a of actors) for (const b of others) {
      if (a.id === b.id) continue;
      const key = `${a.id}:${b.id}`;
      const touching = Math.hypot(a.x-b.x, a.y-b.y) <= a.radius + b.radius;
      if (touching && !rule.touched.has(key)) {
        a.color = rule.effectColor === 'random' ? randomColor() : (colorToHex(rule.effectColor) || rule.effectColor);
        rule.touched.add(key);
      }
      if (!touching) rule.touched.delete(key);
    }
  }
}

function clearWorld() {
  scene.objects = [];
  scene.lastCreatedIds = [];
  scene.lastSelectionIds = [];
  scene.lastWinnerId = null;
  scene.race = null;
  scene.collisionRules = [];
  winnerEl.hidden = true;
  statusEl.textContent = 'Mundo limpo.';
  log('TesteIA', 'Mundo limpo.');
}

function say(message) {
  statusEl.textContent = message;
  log('TesteIA', message);
}

function log(who, message) {
  const p = document.createElement('p');
  const b = document.createElement('b');
  b.textContent = `${who}: `;
  p.appendChild(b);
  p.appendChild(document.createTextNode(message));
  historyEl.appendChild(p);
  historyEl.scrollTop = historyEl.scrollHeight;
}

function draw() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0,0,w,h);

  if (scene.race) {
    ctx.save();
    ctx.setLineDash([8,8]);
    ctx.strokeStyle = 'rgba(255,255,255,.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scene.race.finishX,20);
    ctx.lineTo(scene.race.finishX,h-20);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.font = '11px system-ui';
    ctx.fillText('CHEGADA',Math.max(5,scene.race.finishX-27),16);
    ctx.restore();
  }

  for (const o of scene.objects) {
    ctx.save();
    ctx.shadowColor = o.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = o.color;
    ctx.beginPath();
    ctx.arc(o.x,o.y,o.radius,0,Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${Math.max(9,o.radius*.72)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(o.label,o.x,o.y+.5);
    if (o.group) {
      ctx.font = '10px system-ui';
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.fillText(o.group,o.x,o.y+o.radius+12);
    }
    ctx.restore();
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now-last)/1000,.033);
  last = now;
  updateRace(dt);
  updateBehaviors(dt);
  updateCollisions();
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

form.addEventListener('submit', async e => {
  e.preventDefault();
  const value = input.value.trim();
  if (!value) return;
  input.value = '';
  input.disabled = true;
  try { await interpretAndExecute(value); }
  finally { input.disabled = false; input.focus(); }
});

clearBtn.addEventListener('click', clearWorld);
document.querySelectorAll('[data-command]').forEach(btn =>
  btn.addEventListener('click', () => interpretAndExecute(btn.dataset.command))
);

log('TesteIA', 'Pronto. A IA pode criar, mover, organizar, perseguir, competir e reagir a colisões.');
