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
  lastWinnerId: null
};

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
  onze:11, doze:12, treze:13, quatorze:14, catorze:14, quinze:15, dezesseis:16, dezassete:17, dezessete:17, dezoito:18, dezenove:19, vinte:20
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
  for (const [word, value] of Object.entries(NUMBERS)) if (new RegExp(`\\b${word}\\b`).test(text)) return value;
  return fallback;
}

function extractColor(text) {
  for (const [word, value] of Object.entries(COLORS)) if (new RegExp(`\\b${word}\\b`).test(text)) return value;
  return null;
}

function randomColor() {
  const list = ['#4d8dff','#ff4d5a','#38d996','#ffd84d','#a56cff','#ff9c42','#ff69b4'];
  return list[Math.floor(Math.random() * list.length)];
}

function spawnPoints(count, color) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const ids = [];
  for (let i = 0; i < count; i++) {
    const id = scene.nextId++;
    const radius = 14;
    const columns = Math.ceil(Math.sqrt(count));
    const row = Math.floor(i / columns);
    const col = i % columns;
    const spacingX = Math.min(70, Math.max(36, (w - 100) / Math.max(columns, 1)));
    const spacingY = 52;
    const groupWidth = Math.min((columns - 1) * spacingX, Math.max(0, w - 100));
    const x = Math.max(35, w * 0.5 - groupWidth * 0.5 + col * spacingX);
    const y = Math.max(45, h * 0.45 + (row - Math.floor((count - 1) / columns) / 2) * spacingY);
    scene.objects.push({ id, type:'point', x, y, radius, color: color || randomColor(), vx:0, vy:0, label:String(id), racing:false, finished:false });
    ids.push(id);
  }
  scene.lastCreatedIds = ids;
  return ids;
}

function selectByOrdinal(text) {
  if (!scene.objects.length) return [];
  if (/primeir[oa]/.test(text)) return [scene.objects[0]];
  if (/segund[oa]/.test(text)) return scene.objects[1] ? [scene.objects[1]] : [];
  if (/terceir[oa]/.test(text)) return scene.objects[2] ? [scene.objects[2]] : [];
  if (/ultim[oa]/.test(text)) return [scene.objects[scene.objects.length - 1]];
  if (/vencedor|ganhou|ganhador/.test(text) && scene.lastWinnerId) return scene.objects.filter(o => o.id === scene.lastWinnerId);
  if (/eles|elas|todos|todas|pontos|bolinhas|bolas/.test(text)) return [...scene.objects];
  return scene.lastCreatedIds.length ? scene.objects.filter(o => scene.lastCreatedIds.includes(o.id)) : [...scene.objects];
}

function recolor(text) {
  const color = extractColor(text);
  if (!color) return false;
  const targets = selectByOrdinal(text);
  if (!targets.length) return false;
  targets.forEach(o => o.color = color);
  say(`Cor alterada em ${targets.length} objeto${targets.length > 1 ? 's' : ''}.`);
  return true;
}

function arrange(text) {
  const targets = selectByOrdinal(text);
  if (!targets.length) return false;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  let targetX = w / 2, targetY = h / 2;
  if (/esquerda/.test(text)) targetX = 60;
  if (/direita/.test(text)) targetX = w - 60;
  if (/cima|topo/.test(text)) targetY = 60;
  if (/baixo/.test(text)) targetY = h - 60;
  if (/centro|meio/.test(text)) { targetX = w/2; targetY = h/2; }
  targets.forEach((o, i) => {
    const offset = (i - (targets.length - 1)/2) * Math.min(50, w / Math.max(targets.length + 1, 2));
    o.x = Math.max(24, Math.min(w - 24, targetX + offset));
    o.y = Math.max(24, Math.min(h - 24, targetY));
  });
  say(`Movi ${targets.length} objeto${targets.length > 1 ? 's' : ''}.`);
  return true;
}

function startRace() {
  const racers = scene.objects.filter(o => o.type === 'point');
  if (racers.length < 2) {
    say('Preciso de pelo menos 2 pontos para uma corrida.');
    return;
  }
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const startX = 45;
  const finishX = Math.max(120, w - 55);
  const usableH = Math.max(120, h - 100);
  racers.forEach((o, i) => {
    o.x = startX;
    o.y = 55 + (usableH / Math.max(racers.length, 1)) * (i + 0.5);
    o.vx = 65 + Math.random() * 65;
    o.vy = 0;
    o.racing = true;
    o.finished = false;
  });
  scene.race = { active:true, finishX, startedAt:performance.now(), finishers:[] };
  scene.lastWinnerId = null;
  winnerEl.hidden = true;
  statusEl.textContent = `Corrida iniciada com ${racers.length} competidores`;
  say(`Corrida iniciada com ${racers.length} competidores.`);
}

function enlarge(text) {
  const targets = selectByOrdinal(text);
  if (!targets.length) return false;
  targets.forEach(o => o.radius = Math.min(44, o.radius * 1.8));
  say('Tamanho alterado.');
  return true;
}

function removeTargets(text) {
  if (/tudo|todos|todas|limpar|apagar tudo/.test(text)) {
    clearWorld();
    return true;
  }
  const targets = selectByOrdinal(text);
  const ids = new Set(targets.map(o => o.id));
  scene.objects = scene.objects.filter(o => !ids.has(o.id));
  say(`${ids.size} objeto${ids.size !== 1 ? 's removidos' : ' removido'}.`);
  return true;
}

function parseAndExecute(raw) {
  const text = normalize(raw);
  if (!text) return;
  log('Você', raw);

  if (/apaga|apague|limpa|limpe|remove|remova/.test(text)) {
    removeTargets(text); return;
  }

  let created = false;
  if (/cria|crie|coloca|coloque|adiciona|adicione|apareca|apareça|surja|gere|gera/.test(text) && /ponto|bolinha|bola|circulo|círculo/.test(text)) {
    const count = extractNumber(text, 1);
    const color = extractColor(text);
    spawnPoints(count, color);
    say(`${count} ponto${count > 1 ? 's criados' : ' criado'}.`);
    created = true;
  }

  if (/corrida|correr|corram|corra|disput/.test(text)) {
    startRace(); return;
  }

  if (/vermelh|azul|verde|amarel|rox|rosa|branc|pret|laranj|red|blue|green|yellow|purple|pink|white|black|orange/.test(text) && /deixa|deixe|fica|fique|cor|pinta|pinte/.test(text)) {
    if (recolor(text)) return;
  }

  if (/gigante|maior|aumenta|aumente|cresca|cresça/.test(text)) {
    if (enlarge(text)) return;
  }

  if (/move|mova|leva|leve|vai|vá|coloca|coloque/.test(text) && /esquerda|direita|centro|meio|cima|baixo|topo/.test(text)) {
    if (arrange(text)) return;
  }

  if (created) return;

  say('Ainda não conheço essa ação. Tente criar pontos, mudar a cor, mover, aumentar ou iniciar uma corrida.');
}

function clearWorld() {
  scene.objects = [];
  scene.lastCreatedIds = [];
  scene.lastWinnerId = null;
  scene.race = null;
  winnerEl.hidden = true;
  statusEl.textContent = 'Mundo limpo.';
  say('Mundo limpo.');
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
  for (const o of scene.objects) {
    if (!o.racing || o.finished) continue;
    const wobble = Math.sin(performance.now() * 0.01 + o.id) * 8;
    o.x += (o.vx + wobble) * dt;
    if (o.x >= finishX) {
      o.x = finishX;
      o.finished = true;
      o.racing = false;
      scene.race.finishers.push(o.id);
      if (!scene.lastWinnerId) {
        scene.lastWinnerId = o.id;
        winnerEl.textContent = `🏆 Ponto ${o.id} venceu!`;
        winnerEl.hidden = false;
        say(`Ponto ${o.id} venceu a corrida!`);
      }
    }
  }
  if (scene.race.finishers.length === scene.objects.filter(o => o.type === 'point').length) scene.race.active = false;
}

function draw() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  if (scene.race) {
    ctx.save();
    ctx.setLineDash([8,8]);
    ctx.strokeStyle = 'rgba(255,255,255,.65)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(scene.race.finishX, 20); ctx.lineTo(scene.race.finishX, h - 20); ctx.stroke();
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

form.addEventListener('submit', e => {
  e.preventDefault();
  const value = input.value.trim();
  if (!value) return;
  input.value = '';
  parseAndExecute(value);
  input.focus();
});

clearBtn.addEventListener('click', clearWorld);
document.querySelectorAll('[data-command]').forEach(btn => btn.addEventListener('click', () => parseAndExecute(btn.dataset.command)));

log('TesteIA', 'Olá. Peça para eu criar pontos e controlar o mundo.');
