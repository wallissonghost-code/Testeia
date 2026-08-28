const MODEL = process.env.TESTEIA_MODEL || 'openai/gpt-5.6-luna';
const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';

const ACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    actions: {
      type: 'array',
      maxItems: 24,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string', enum: ['spawn','color','move','scale','speed','race','remove','clear','chase','stop','collision_rule'] },
          count: { type: ['integer','null'], minimum: 1, maximum: 100 },
          color: { type: ['string','null'] },
          group: { type: ['string','null'] },
          target: { type: ['string','null'] },
          otherTarget: { type: ['string','null'] },
          ordinal: { type: ['integer','null'], minimum: 1 },
          direction: { type: ['string','null'], enum: ['left','right','top','bottom','center',null] },
          factor: { type: ['number','null'], minimum: 0.1, maximum: 5 },
          effectColor: { type: ['string','null'] }
        },
        required: ['type','count','color','group','target','otherTarget','ordinal','direction','factor','effectColor']
      }
    },
    reply: { type: 'string' }
  },
  required: ['actions','reply']
};

const SYSTEM = `Você é o cérebro de um mundo 2D chamado TesteIA. Converta pedidos em português natural em ações seguras e estruturadas. Nunca escreva JavaScript e nunca invente tipos de ação fora do schema.

SELETORES possíveis em target/otherTarget:
- all
- last-created
- winner
- selection
- ordinal:N
- color:vermelho | color:azul | color:verde | color:amarelo | color:roxo | color:rosa | color:branco | color:preto | color:laranja
- group:NOME

AÇÕES:
- spawn: cria pontos. count, color, group e direction podem ser usados. direction indica onde o grupo nasce.
- color: muda a cor do target.
- move: move target para direction.
- scale: multiplica tamanho por factor.
- speed: define multiplicador de velocidade.
- race: inicia corrida dos objetos selecionados; use all quando o usuário não restringir.
- chase: target passa a perseguir otherTarget.
- stop: target para de perseguir/mover.
- collision_rule: quando target encostar em otherTarget, target muda para effectColor. Use effectColor=random quando o usuário só disser “muda de cor”.
- remove e clear removem objetos.

Interprete contexto usando o estado da cena. Preserve a ordem lógica das ações. Se o usuário disser “dois grupos” sem quantidade por grupo, use 5 em cada grupo. Se nomear grupos por cor, use também group com o nome da cor. Para “o vermelho persegue o azul”, prefira seletores color:vermelho e color:azul. Para “quando encostar muda de cor”, crie collision_rule. Retorne apenas dados compatíveis com o schema.`;

function sanitizeScene(scene) {
  const objects = Array.isArray(scene?.objects) ? scene.objects.slice(0, 120) : [];
  return {
    objects: objects.map(o => ({
      id: Number(o.id),
      type: String(o.type || 'point'),
      color: String(o.color || ''),
      group: o.group ? String(o.group) : null,
      x: Number(o.x || 0),
      y: Number(o.y || 0),
      radius: Number(o.radius || 14)
    })),
    lastCreatedIds: Array.isArray(scene?.lastCreatedIds) ? scene.lastCreatedIds.slice(0,100) : [],
    lastWinnerId: scene?.lastWinnerId ?? null,
    raceActive: Boolean(scene?.raceActive),
    recentCommands: Array.isArray(scene?.recentCommands) ? scene.recentCommands.slice(-8) : []
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const command = typeof req.body?.command === 'string' ? req.body.command.trim().slice(0, 1200) : '';
  if (!command) return res.status(400).json({ error: 'command_required' });

  const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'ai_auth_unavailable', actions: [] });
  }

  const scene = sanitizeScene(req.body?.scene);

  try {
    const response = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `ESTADO ATUAL:\n${JSON.stringify(scene)}\n\nPEDIDO:\n${command}` }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'testeia_actions',
            strict: true,
            schema: ACTION_SCHEMA
          }
        }
      })
    });

    const raw = await response.text();
    if (!response.ok) {
      console.error('AI Gateway error', response.status, raw.slice(0, 800));
      return res.status(502).json({ error: 'ai_gateway_error', actions: [] });
    }

    const payload = JSON.parse(raw);
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ error: 'empty_ai_response', actions: [] });

    const result = JSON.parse(content);
    return res.status(200).json({
      actions: Array.isArray(result.actions) ? result.actions.slice(0,24) : [],
      reply: typeof result.reply === 'string' ? result.reply.slice(0,300) : ''
    });
  } catch (error) {
    console.error('interpret failed', error);
    return res.status(500).json({ error: 'interpret_failed', actions: [] });
  }
}
