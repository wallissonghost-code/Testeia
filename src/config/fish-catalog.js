export const RARITIES={common:{label:'COMUM',weight:52,color:'#aab6c4'},uncommon:{label:'INCOMUM',weight:27,color:'#62d995'},rare:{label:'RARO',weight:13,color:'#5da8ff'},epic:{label:'ÉPICO',weight:5.5,color:'#b47cff'},legendary:{label:'LENDÁRIO',weight:2,color:'#ffd05f'},mythic:{label:'MÍTICO',weight:.5,color:'#ff6e9d'}};
export const FISH=[
{id:'sardine',name:'Sardinha',emoji:'🐟',rarity:'common',points:8,size:1},
{id:'tilapia',name:'Tilápia',emoji:'🐠',rarity:'common',points:12,size:1},
{id:'catfish',name:'Bagre',emoji:'🐟',rarity:'uncommon',points:22,size:2},
{id:'pacu',name:'Pacu Dourado',emoji:'🐠',rarity:'uncommon',points:28,size:2},
{id:'tuna',name:'Atum Azul',emoji:'🐟',rarity:'rare',points:55,size:3},
{id:'swordfish',name:'Peixe-Espada',emoji:'🐡',rarity:'rare',points:70,size:4},
{id:'koi',name:'Koi Imperial',emoji:'🐠',rarity:'epic',points:130,size:4},
{id:'shark',name:'Tubarão Fantasma',emoji:'🦈',rarity:'epic',points:170,size:5},
{id:'golden',name:'Leviatã Dourado',emoji:'🐉',rarity:'legendary',points:360,size:6},
{id:'void',name:'Peixe do Vazio',emoji:'🌌',rarity:'mythic',points:800,size:7}
];
export const fishByRarity=rarity=>FISH.filter(f=>f.rarity===rarity);