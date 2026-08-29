# Live Fishing RNG 🎣

Jogo 2D fullscreen para interação com TikTok Live usando o protocolo universal do **Projeto Daniel / LivePlus**.

## Fluxo

`TikTok -> Projeto Daniel -> regra configurada -> comando do jogo -> RNG -> ranking/state/event -> painel`

O jogo anuncia um `game_manifest` com as ações `fish_comment`, `fish_gift`, `fish_test` e `reset_session`. O Projeto Daniel continua responsável por decidir qual comentário ou presente dispara cada ação.

## Balanceamento

Comentários sempre podem pescar. Atividade recente do mesmo usuário dá um bônus pequeno e limitado. Presentes recebem bônus maior baseado em diamantes e quantidade, porém com teto. Nenhuma doação garante peixe mítico.

## Arquitetura

- `src/config/` catálogo e balanceamento.
- `src/core/` RNG e regra de pontuação.
- `src/integrations/` conexão LivePlus/Projeto Daniel.
- `src/ui/` HUD, catálogo e animação do pescador.
- `tests/` testes de RNG e concorrência lógica.
- `scripts/` QA e guardião de balanceamento.
- `.github/workflows/` CI Bot, QA Bot e AI Guardian.

## Conexão

O código da partida pode vir por `?code=ABCDEFGH` ou pelo `sessionStorage` entregue pelo fluxo do painel. A conexão usa `liveplus-session-<codigo>` e protocolo `liveplus-match-v1`, compatível com os jogos de referência.

## Testes locais

```bash
npm run ci
```

No navegador, durante desenvolvimento, também há `window.FishingGameTest.catchComment()`, `catchGift()`, `snapshot()` e `reset()` para smoke tests manuais.
