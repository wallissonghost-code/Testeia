# Live Fishing RNG 🎣

Jogo 2D fullscreen para interação com TikTok Live usando o protocolo universal do **Projeto Daniel / LivePlus**.

## Fluxo

`TikTok -> Projeto Daniel -> regra configurada -> comando do jogo -> RNG -> ranking/state/event -> painel`

O jogo anuncia um `game_manifest` com ações de pesca, sessão, pausa e sincronização. O Projeto Daniel continua responsável por decidir qual comentário ou presente dispara cada ação.

## Estrutura principal

- `assets/` — toda a arte e mídia do jogo.
  - `assets/maps/` — mapas, fundos, cenário, água, céu, píer e props.
  - `assets/fish/` — sprites e skins dos peixes.
  - `assets/fishermen/` — pescador, roupas, varas, acessórios e skins.
  - `assets/animations/` — sprite sheets e animações auxiliares.
  - `assets/ui/` — HUD, ícones, botões e molduras.
  - `assets/effects/` — partículas, brilho e efeitos de raridade.
  - `assets/audio/` — música e efeitos sonoros.
- `src/config/` — catálogo, balanceamento e registro central de assets.
- `src/core/` — RNG, pontuação e regras de pesca.
- `src/integrations/` — conexão LivePlus/Projeto Daniel.
- `src/ui/` — HUD, sessão e renderização visual.
- `tests/` — testes do motor e RNG.
- `scripts/` — QA e guardião de balanceamento.
- `.github/workflows/` — CI Bot, QA Bot e AI Guardian.
- `docs/` — documentação interna da arquitetura.

## Troca de mapa e skins

Os caminhos futuros de mapas, pescadores, peixes, UI, efeitos e áudio devem ser registrados em `src/config/assets.js`. Assim a arte pode ser trocada sem mexer na lógica de RNG, conexão, ranking ou comandos da live.

Veja também `docs/ASSET-STRUCTURE.md`.

## Balanceamento

Comentários sempre podem pescar. Atividade recente do mesmo usuário dá um bônus pequeno e limitado. Presentes recebem bônus maior baseado em diamantes e quantidade, porém com teto. Nenhuma doação garante peixe mítico.

## Conexão

A conexão usa `liveplus-session-<codigo>` e protocolo `liveplus-match-v1`, compatível com os jogos de referência e com o Projeto Daniel.

## Testes locais

```bash
npm run ci
```

No navegador, durante desenvolvimento, há também `window.FishingGameTest` para smoke tests manuais.
