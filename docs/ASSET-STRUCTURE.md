# Estrutura de arte e conteúdo

O jogo foi separado para que novas artes possam ser adicionadas sem misturar lógica, HUD e integração com o Projeto Daniel.

## Pastas de upload

```text
assets/
├── maps/         mapas, fundos e cenário
├── fish/         sprites e skins de peixes
├── fishermen/    personagem, roupas, varas e skins
├── animations/   sprite sheets de efeitos e movimentos
├── ui/           HUD, ícones e molduras
├── effects/      partículas e efeitos de raridade
└── audio/        músicas e efeitos sonoros
```

## Código

```text
src/
├── config/        catálogo, balanceamento e registro de assets
├── core/          RNG, pontuação e regras de pesca
├── integrations/  conexão com Projeto Daniel / LivePlus
└── ui/            HUD, sessão e renderização visual
```

## Regra importante

Ao adicionar uma nova skin ou mapa, evite colocar caminhos diretamente em vários arquivos JavaScript. Registre o caminho em `src/config/assets.js` e faça a camada visual consumir esse registro.

Isso permite trocar arte sem alterar RNG, conexão, ranking ou regras da live.
