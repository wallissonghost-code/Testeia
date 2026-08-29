// Registro central de assets do Live Fishing RNG.
// A ideia é apontar o jogo para um único lugar quando mapas/skins forem trocados.

export const ASSETS = {
  maps: {
    main: null,
    sky: null,
    water: null,
    dock: null
  },
  fishermen: {
    default: {
      idle: null,
      cast: null,
      pull: null,
      celebrate: null,
      icon: null
    }
  },
  fish: {
    // Exemplo futuro:
    // 'peixe-dourado': {
    //   idle: './assets/fish/peixe-dourado/idle.png',
    //   hooked: './assets/fish/peixe-dourado/hooked.png',
    //   icon: './assets/fish/peixe-dourado/icon.png'
    // }
  },
  ui: {},
  effects: {},
  audio: {}
};

export function asset(path, fallback = null) {
  const parts = String(path || '').split('.').filter(Boolean);
  let value = ASSETS;
  for (const part of parts) {
    if (!value || typeof value !== 'object' || !(part in value)) return fallback;
    value = value[part];
  }
  return value ?? fallback;
}
