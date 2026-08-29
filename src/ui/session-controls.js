import{formatCode}from'../integrations/liveplus.js';
const $=id=>document.getElementById(id);
export class SessionControls extends EventTarget{
  constructor(){super();this.connected=false;this.paused=false;this.bind()}
  bind(){
    $('sessionBtn').onclick=()=>this.openSession();
    $('closeSession').onclick=()=>this.closeSession();
    $('connectSession').onclick=()=>this.emit('connect',{code:$('panelCode').value});
    $('disconnectSession').onclick=()=>this.emit('disconnect',{});
    $('panelCode').oninput=()=>{$('panelCode').value=formatCode($('panelCode').value)};
    $('pauseBtn').onclick=()=>this.setPaused(!this.paused,true);
    $('resumeBtn').onclick=()=>this.setPaused(false,true);
    $('pauseConnectBtn').onclick=()=>{this.setPaused(false,false);this.openSession()};
  }
  emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail}))}
  openSession(){const d=$('sessionModal');if(typeof d.showModal==='function'&&!d.open)d.showModal()}
  closeSession(){const d=$('sessionModal');if(d.open)d.close()}
  setCode(code=''){if(code)$('panelCode').value=formatCode(code);$('sessionCode').textContent=code?formatCode(code):'--------'}
  status(detail={}){const state=detail.state||'waiting',code=detail.code||'';if(code)this.setCode(code);this.connected=state==='connected';
    const labels={waiting:'AGUARDANDO CÓDIGO',connecting:'CONECTANDO...',reconnecting:'RECONECTANDO...',connected:'PAINEL CONECTADO',disconnected:'PAINEL DESCONECTADO',offline:'DESCONECTADO',error:'ERRO DE CONEXÃO',timeout:'PAINEL NÃO RESPONDEU',lost:'CONEXÃO PERDIDA',rejected:'SESSÃO RECUSADA'};
    const text=labels[state]||String(state).toUpperCase();$('sessionState').textContent=text;$('sessionState').classList.toggle('ok',this.connected);$('sessionBtn').classList.toggle('connected',this.connected);$('sessionBtn').textContent=this.connected?'✓':'🔗';$('connectSession').textContent=this.connected?'RECONECTAR':'CONECTAR';$('disconnectSession').disabled=!this.connected&&state!=='reconnecting';
    if(detail.reason)$('sessionMessage').textContent=detail.reason;else if(this.connected)$('sessionMessage').textContent='Jogo e Projeto Daniel estão trocando dados nos dois sentidos.';else $('sessionMessage').textContent='Digite o código de 8 caracteres gerado no Projeto Daniel.';
  }
  setPaused(on,notify=false){this.paused=!!on;document.body.classList.toggle('game-paused',this.paused);$('pauseOverlay').classList.toggle('show',this.paused);$('pauseBtn').classList.toggle('paused',this.paused);$('pauseBtn').textContent=this.paused?'▶':'Ⅱ';$('pauseStatus').textContent=this.connected?'PAINEL ON':'PAINEL OFF';if(notify)this.emit('pausechange',{paused:this.paused})}
}
