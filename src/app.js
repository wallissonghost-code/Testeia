import{FishingEngine}from'./core/fishing-engine.js';
import{LivePlusConnection,eventUser,giftMeta}from'./integrations/liveplus.js';
import{HUD}from'./ui/hud.js';
import{FishingScene}from'./ui/scene.js';
import{SessionControls}from'./ui/session-controls.js';

let engine=new FishingEngine();
const live=new LivePlusConnection(),hud=new HUD(engine),scene=new FishingScene(),session=new SessionControls();
let stateTimer=null,paused=false,pendingCommands=[];

function statePayload(){return{...engine.snapshot(),paused,pendingCommands:pendingCommands.length,session:{connected:live.connected,code:live.code||''},version:'0.2.0'}}
function publishState(force=false){clearTimeout(stateTimer);const send=()=>live.sendState(statePayload());if(force)send();else stateTimer=setTimeout(send,100)}
function handleCatch(payload){const result=engine.catch(payload);hud.onCatch(result);scene.enqueue(result);live.sendEvent({event:'fish_caught',user:result.user,fishId:result.fish.id,fishName:result.fish.name,rarity:result.fish.rarity,points:result.points,totalPoints:result.total,source:result.source,luck:Number(result.luck.toFixed(3))});publishState();return result}
function resetSession(){engine=new FishingEngine();hud.engine=engine;hud.reset();pendingCommands=[];live.sendEvent({event:'session_reset'});publishState(true)}
function setPaused(on,source='game'){paused=!!on;session.setPaused(paused,false);live.sendEvent({event:paused?'game_paused':'game_resumed',source,pendingCommands:pendingCommands.length});publishState(true);if(!paused)drainQueue()}
function drainQueue(){if(paused||!pendingCommands.length)return;const queue=pendingCommands.splice(0);queue.forEach((d,i)=>setTimeout(()=>executeFishingCommand(d),Math.min(i*90,2500)));publishState()}
function queueCommand(d){pendingCommands.push(d);if(pendingCommands.length>150)pendingCommands.shift();live.sendEvent({event:'command_queued',action:d.action||'',user:eventUser(d),queueSize:pendingCommands.length});publishState()}
function executeFishingCommand(d){const action=String(d.action||'');if(action==='fish_comment')return handleCatch({username:eventUser(d),source:'comment',event:d.event||null});if(action==='fish_gift'){const meta=giftMeta(d);return handleCatch({username:eventUser(d),source:'gift',...meta,event:d.event||null})}if(action==='fish_test')return handleCatch({username:d.params?.username||'teste',source:'comment'})}
function handleCommand(d={}){const action=String(d.action||'');if(action==='pause_game')return setPaused(true,'panel');if(action==='resume_game')return setPaused(false,'panel');if(action==='request_state')return publishState(true);if(action==='reset_session')return resetSession();if(['fish_comment','fish_gift','fish_test'].includes(action)){if(paused)return queueCommand(d);return executeFishingCommand(d)}}

live.addEventListener('status',e=>{hud.status(e.detail.state);session.status(e.detail);if(e.detail.state==='connected')publishState(true)});
live.addEventListener('rules',e=>hud.rules(e.detail.rules));
live.addEventListener('command',e=>handleCommand(e.detail||{}));
live.addEventListener('message',e=>{const d=e.detail||{};if(d.type==='request_state'||d.type==='state_request')publishState(true)});
session.addEventListener('connect',e=>live.connect(e.detail.code));
session.addEventListener('disconnect',()=>live.disconnect());
session.addEventListener('pausechange',e=>setPaused(e.detail.paused,'game'));

window.FishingGameTest={catchComment:(user='teste')=>paused?queueCommand({action:'fish_comment',params:{username:user},event:{user}}):handleCatch({username:user,source:'comment'}),catchGift:(user='teste',diamonds=100,count=1)=>paused?queueCommand({action:'fish_gift',event:{user,diamondCount:diamonds,count}}):handleCatch({username:user,source:'gift',diamonds,count}),snapshot:()=>statePayload(),reset:resetSession,pause:()=>setPaused(true,'test'),resume:()=>setPaused(false,'test'),connect:code=>live.connect(code)};

hud.renderStats();hud.renderRank();hud.renderFeed();session.setCode(live.resolveCode());live.connect();document.addEventListener('visibilitychange',()=>{if(!document.hidden)publishState(true)});