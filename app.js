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
  commandHistory: []
};

// Opcional: aponte para um backend seu que aceite { command, scene }
// e devolva { actions: [...] }. Sem endpoint configurado, o interpretador local assume.
const AI_ENDPOINT = window.TESTEIA_AI_ENDPOINT || '';

const COLORS = {
  vermelho: '#ff4d5a', vermelhos: '#ff4d5a', vermelha: '#ff4d5a', vermelhas: '#ff4d5a', red: '#ff4d5a',
  azul: '#4d8dff', azuis: '#4d8dff', blue: '#4d8dff',
  verde: '#38d996', verdes: '#38d996', green: '#38d996',
  amarelo: '#ffd84d', amarelos: '#ffd84d', yellow: '#ffd84d',
  roxo: '#a56cff', roxos: '#a56cff', purple: '#a56cff',
  rosa: '#ff69b4', rosas: '#ff69b4', pink: '#ff69b4',
  branco: '#f4f7fb', brancos: '#f4f7fb', white: '#f4f7fb',
  preto: '#111318', pretos: '#111318', black: '#111318',
  laranja: '#ff9c42', laranjas: '#ff9c42', orange: '#ff9c42'
};

const NUMBERS = {
  um:1, uma:1, dois:2, duas:2, tres:3, três:3, quatro:4, cinco:5, seis:6, sete:7, oito:8, nove:9, dez:10,
  onze:11, doze:12, treze:13, quatorze:14, catorze:14, quinze:15, dezesseis:16, dezassete:17, dezessete:17,
  dezoito:18, dezenove:19, vinte:20
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

function extractColor(text) {
  for (const [word, value] of Object.entries(COLORS)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) return value;
  }
  return null;
}

function randomColor() {
  const list = ['#4d8dff','#ff4d5a','#38d996','#ffd84d','#a56cff','#ff9c42','#ff69b4'];
  return list[Math.floor(Math.random() * list.length)];
}

function snapshotScene() {
  return {
    objects: scene.objects.map(o => ({ id:o.id, type:o.type, color:o.color, x:Math.round(o.x), y:Math.round(o.y), radius:o.radius })),
    lastCreatedIds: [...scene.lastCreatedIds],
    lastWinnerId: scene.lastWinnerId,
    raceActive: !!scene.race?.active
  };
}

function spawnPoints(count = 1, color = null) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const ids = [];
  const columns = Math.ceil(Math.sqrt(count));
  for (let i = 0; i < count; i++) {
    const id = scene.nextId++;
    const radius = 14;
    const row = Math.floor(i / columns);
    const col = i % columns;
    const spacingX = Math.min(70, Math.max(36, (w - 100) / Math.max(columns, 1)));
    const spacingY = 52;
    const groupWidth = Math.min((columns - 1) * spacingX, Math.max(0, w - 100));
    const x = Math.max(35, w * 0.5 - groupWidth * 0.5 + col * spacingX);
    const y = Math.max(45, h * 0.45 + (row - Math.floor((count - 1) / columns) / 2) * spacingY);
    scene.objects.push({ id, type:'point', x, y, radius, color:color || randomColor(), vx:0, vy:0, label:String(id), racing:false, finished:false });
    ids.push(id);
  }
  scene.lastCreatedIds = ids;
  scene.lastSelectionIds = ids;
  return ids;
}

function resolveTargets(target = 'last', ordinal = null) {
  if (!scene.objects.length) return [];
  if (target === 'all') return [...scene.objects];
  if (target === 'winner' && scene.lastWinnerId) return scene.objects.filter(o => o.id === scene.lastWinnerId);
  if (target === 'last-created') return scene.objects.filter(o => scene.lastCreatedIds.includes(o.id));
  if (target === 'selection') return scene.objects.filter(o => scene.lastSelectionIds.includes(o.id));
  if (ordinal != null) return scene.objects[ordinal - 1] ? [scene.objects[ordinal - 1]] : [];
  return scene.lastCreatedIds.length ? scene.objects.filter(o => scene.lastCreatedIds.includes(o.id)) : [...scene.objects];
}

function targetFromText(text) {
  if (/vencedor|ganhou|ganhador/.test(text)) return { target:'winner' };
  if (/primeir[oa]/.test(text)) return { target:'ordinal', ordinal:1 };
  if (/segund[oa]/.test(text)) return { target:'ordinal', ordinal:2 };
  if (/terceir[oa]/.test(text)) return { target:'ordinal', ordinal:3 };
  if (/quart[oa]/.test(text)) return { target:'ordinal', ordinal:4 };
  if (/ultim[oa]/.test(text)) return { target:'ordinal', ordinal:scene.objects.length };
  if (/eles|elas|todos|todas|pontos|bolinhas|bolas/.test(text)) return { target:'all' };
  return { target:'last-created' };
}

function positionFor(direction, index = 0, total = 1) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  let x = w / 2, y = h / 2;
  if (direction === 'left') x = 60;
  if (direction === 'right') x = w - 60;
  if (direction === 'top') y = 60;
  if (direction === 'bottom') y = h - 60;
  const offset = (index - (total - 1)/2) * Math.min(50, w / Math.max(total + 1, 2));
  return { x:Math.max(24, Math.min(w - 24, x + offset)), y:Math.max(24, Math.min(h - 24, y)) };
}

function startRace(targets = scene.objects.filter(o => o.type === 'point')) {
  const racers = targets.filter(o => o.type === 'point');
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
  });
  scene.race = { active:true, finishX, startedAt:performance.now(), finishers:[], racerIds:racers.map(o => o.id) };
  scene.lastWinnerId = null;
  winnerEl.hidden = true;
  statusEl.textContent = `Corrida iniciada com ${racers.length} competidores`;
  return true;
}

function executeAction(action) {
  if (!action || typeof action !== 'object') return false;
  const type = action.type;

  if (type === 'spawn') {
    const count = Math.max(1, Math.min(Number(action.count || 1), 100));
    spawnPoints(count, action.color || null);
    say(`${count} ponto${count > 1 ? 's criados' : ' criado'}.`);
    return true;
  }

  const targets = resolveTargets(action.target || 'last-created', action.ordinal || null);

  if (type === 'color') {
    if (!targets.length || !action.color) return false;
    targets.forEach(o => o.color = action.color);
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
    const factor = Number(action.factor || 1.8);
    targets.forEach(o => o.radius = Math.max(5, Math.min(60, o.radius * factor)));
    scene.lastSelectionIds = targets.map(o => o.id);
    say('Tamanho alterado.');
    return true;
  }

  if (type === 'speed') {
    if (!targets.length) return false;
    const factor = Math.max(0.1, Math.min(Number(action.factor || 1), 5));
    targets.forEach(o => { o.speedMultiplier = factor; });
    scene.lastSelectionIds = targets.map(o => o.id);
    say(`Velocidade relativa definida para ${factor.toFixed(1)}x.`);
    return true;
  }

  if (type === 'race') {
    const raceTargets = action.target === 'last-created' ? resolveTargets('last-created') : scene.objects;
    if (startRace(raceTargets)) say(`Corrida iniciada com ${raceTargets.length} competidores.`);
    return true;
  }

  if (type === 'remove') {
    if (action.target === 'all') { clearWorld(); return true; }
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
  const clauses = text.split(/\b(?:e depois|depois|entao|então|e)\b/).map(x => x.trim()).filter(Boolean);

  for (const clause of clauses) {
    const targetInfo = targetFromText(clause);
    const target = targetInfo.target === 'ordinal' ? 'last-created' : targetInfo.target;
    const ordinal = targetInfo.ordinal || null;
    const color = extractColor(clause);

    if (/apaga tudo|apague tudo|limpa tudo|limpe tudo|limpar mundo/.test(clause)) {
      actions.push({ type:'clear' });
      continue;
    }

    if (/(cria|crie|coloca|coloque|adiciona|adicione|apareca|apareça|surja|gere|gera)/.test(clause) && /(ponto|bolinha|bola|circulo|círculo)/.test(clause)) {
      actions.push({ type:'spawn', count:extractNumber(clause, 1), color });
      continue;
    }

    if (/corrida|correr|corram|corra|disput/.test(clause)) {
      actions.push({ type:'race', target:'all' });
      continue;
    }

    if (color && /(deixa|deixe|fica|fique|cor|pinta|pinte|torna|torne)/.test(clause)) {
      actions.push({ type:'color', target, ordinal, color });
      continue;
    }

    if (/duas vezes mais rapid|2x mais rapid|dobro da velocidade/.test(clause)) {
      actions.push({ type:'speed', target, ordinal, factor:2 });
      continue;
    }

    if (/mais rapid/.test(clause)) {
      actions.push({ type:'speed', target, ordinal, factor:1.5 });
      continue;
    }

    if (/mais lent/.test(clause)) {
      actions.push({ type:'speed', target, ordinal, factor:0.6 });
      continue;
    }

    if (/gigante|maior|aumenta|aumente|cresca|cresça/.test(clause)) {
      actions.push({ type:'scale', target, ordinal, factor:1.8 });
      continue;
    }

    if (/menor|diminui|diminua|encolh/.test(clause)) {
      actions.push({ type:'scale', target, ordinal, factor:0.6 });
      continue;
    }

    if (/(move|mova|leva|leve|vai|vá|coloca|coloque)/.test(clause) && /(esquerda|direita|centro|meio|cima|baixo|topo)/.test(clause)) {
      let direction = 'center';
      if (/esquerda/.test(clause)) direction = 'left';
      if (/direita/.test(clause)) direction = 'right';
      if (/cima|topo/.test(clause)) direction = 'top';
      if (/baixo/.test(clause)) direction = 'bottom';
      actions.push({ type:'move', target, ordinal, direction });
      continue;
    }

    if (/apaga|apague|remove|remova/.test(clause)) {
      actions.push({ type:'remove', target, ordinal });
    }
  }

  // Frases compostas comuns sem conectivo explícito.
  if (!actions.some(a => a.type === 'race') && /corrida|correr|corram|corra/.test(text)) actions.push({ type:'race', target:'all' });
  return actions;
}

function validateActions(actions) {
  const allowed = new Set(['spawn','color','move','scale','speed','race','remove','clear']);
  return (Array.isArray(actions) ? actions : []).filter(a => a && allowed.has(a.type)).slice(0, 20);
}

async function remotePlan(command) {
  if (!AI_ENDPOINT) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(AI_ENDPOINT, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body:JSON.stringify({ command, scene:snapshotScene() }),
      signal:controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return validateActions(data.actions);
  } catch (error) {
    console.warn('TesteIA: backend de IA indisponível; usando interpretação local.', error);
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
  statusEl.textContent = 'Entendendo comando…';

  const aiActions = await remotePlan(raw);
  const actions = validateActions(aiActions?.length ? aiActions : localPlan(raw));

  if (!actions.length) {
    say('Não consegui transformar esse pedido em uma ação ainda.');
    return;
  }

  let executed = 0;
  for (const action of actions) if (executeAction(action)) executed++;
  if (!executed) say('Entendi a intenção, mas não encontrei objetos compatíveis para executar.');
}

function clearWorld() {
  scene.objects = [];
  scene.lastCreatedIds = [];
  scene.lastSelectionIds = [];
  scene.lastWinnerId = null;
  scene.race = null;
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

function update(dt) {
  if (!scene.race?.active) return;
  const finishX = scene.race.finishX;
  const racers = scene.objects.filter(o => scene.race.racerIds.includes(o.id));
  for (const o of racers) {
    if (!o.racing || o.finished) continue;
    const multiplier = o.speedMultiplier || 1;
    const wobble = Math.sin(performance.now() * 0.01 + o.id) * 8;
    o.x += (o.vx * multiplier + wobble) * dt;
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

function draw() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  if (scene.race) {
    ctx.save();
    ctx.setLineDash([8,8]);
    ctx.strokeStyle = 'rgba(255,255,255,.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scene.race.finishX, 20);
    ctx.lineTo(scene.race.finishX, h - 20);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.font = '11px system-ui';
    ctx.fillText('CHEGADA', Math.max(5, scene.race.finishX - 27), 16);
    ctx.restore();
  }

  for (const o of scene.objects) {
    ctx.save();
    ctx.shadowColor = o.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = o.color;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${Math.max(9, o.radius * .72)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(o.label, o.x, o.y + .5);
    ctx.restore();
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, .033);
  last = now;
  update(dt);
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
  try {
    await interpretAndExecute(value);
  } finally {
    input.disabled = false;
    input.focus();
  }
});

clearBtn.addEventListener('click', clearWorld);
document.querySelectorAll('[data-command]').forEach(btn => btn.addEventListener('click', () => interpretAndExecute(btn.dataset.command)));

log('TesteIA', 'Pronto. Eu transformo seus pedidos em ações dentro deste mundo.');
