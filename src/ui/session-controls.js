import{formatCode}from'../integrations/liveplus.js';
const $=id=>document.getElementById(id);
const bind=(id,fn)=>{const el=$(id);if(!el)throw new Error(`Controle ausente: ${id}`);el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();fn(e)},{passive:false});return el};
export class SessionControls extends EventTarget{
  constructor(){super();this.connected=false;this.paused=false;this.bind()}
  bind(){
    bind('sessionBtn',()=>this.openSession());
    bind('closeSession',()=>this.closeSession());
    bind('connectSession',()=>this.emit('connect',{code:$('panelCode').value}));
    bind('disconnectSession',()=>this.emit('disconnect',{}));
    const panelCode=$('panelCode');panelCode.addEventListener('input',()=>{panelCode.value=formatCode(panelCode.value)});
    bind('pauseBtn',()=>this.setPaused(!this.paused,true));
    bind('resumeBtn',()=>this.setPaused(false,true));
    bind('pauseConnectBtn',()=>{this.setPaused(false,false);this.openSession()});
  }
  emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail}))}
  openSession(){const d=$('sessionModal');if(!d)return;if(typeof d.showModal==='function'){if(!d.open)d.showModal()}else{d.setAttribute('open','');d.classList.add('fallback-open')}}
  closeSession(){const d=$('sessionModal');if(!d)return;if(typeof d.close==='function'&&d.open)d.close();else{d.removeAttribute('open');d.classList.remove('fallback-open')}}
  setCode(code=''){if(code)$('panelCode').value=formatCode(code);$('sessionCode').textContent=code?formatCode(code):'--------'}
  status(detail={}){const state=detail.state||'waiting',code=detail.code||'';if(code)this.setCode(code);this.connected=state==='connected';const labels={waiting:'AGUARDANDO CÓDIGO',connecting:'CONECTANDO...',reconnecting:'RECONECTANDO...',connected:'PAINEL CONECTADO',disconnected:'PAINEL DESCONECTADO',offline:'DESCONECTADO',error:'ERRO DE CONEXÃO',timeout:'PAINEL NÃO RESPONDEU',lost:'CONEXÃO PERDIDA',rejected:'SESSÃO RECUSADA'};const text=labels[state]||String(state).toUpperCase();$('sessionState').textContent=text;$('sessionState').classList.toggle('ok',this.connected);$('sessionBtn').classList.toggle('connected',this.connected);$('sessionBtn').textContent=this.connected?'✓':'🔗';$('connectSession').textContent=this.connected?'RECONECTAR':'CONECTAR';$('disconnectSession').disabled=!this.connected&&state!=='reconnecting';if(detail.reason)$('sessionMessage').textContent=detail.reason;else if(this.connected)$('sessionMessage').textContent='Jogo e Projeto Daniel estão trocando dados nos dois sentidos.';else $('sessionMessage').textContent='Digite o código de 8 caracteres gerado no Projeto Daniel.';$('pauseStatus').textContent=this.connected?'PAINEL ON':'PAINEL OFF'}
  setPaused(on,notify=false){this.paused=!!on;document.body.classList.toggle('game-paused',this.paused);$('pauseOverlay').classList.toggle('show',this.paused);$('pauseBtn').classList.toggle('paused',this.paused);$('pauseBtn').textContent=this.paused?'▶':'Ⅱ';$('pauseStatus').textContent=this.connected?'PAINEL ON':'PAINEL OFF';if(notify)this.emit('pausechange',{paused:this.paused})}
}
