import fs from'node:fs';
const required=['index.html','styles/main.css','styles/session.css','src/app.js','src/core/fishing-engine.js','src/integrations/liveplus.js','src/ui/session-controls.js','src/config/fish-catalog.js'];
for(const f of required){if(!fs.existsSync(f))throw Error('Arquivo obrigatório ausente: '+f)}
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('styles/main.css','utf8'),live=fs.readFileSync('src/integrations/liveplus.js','utf8'),app=fs.readFileSync('src/app.js','utf8');
if(!html.includes('viewport-fit=cover'))throw Error('Viewport mobile incompleto');
if(!css.includes('position:fixed'))throw Error('Tela cheia não protegida');
for(const id of['sessionBtn','pauseBtn','sessionModal','panelCode','pauseOverlay'])if(!html.includes(`id="${id}"`))throw Error('Controle de sessão ausente: '+id);
for(const token of['liveplus-match-v1','liveplus-game-manifest-v1','fish_comment','fish_gift','pause_game','resume_game','request_state','reset_session'])if(!live.includes(token))throw Error('Protocolo ausente: '+token);
for(const token of['sendState','sendEvent','pendingCommands','setPaused'])if(!app.includes(token))throw Error('Fluxo bidirecional ausente: '+token);
console.log('QA OK: layout, sessão, pausa e protocolo bidirecional LivePlus verificados.');