function numberFromEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeQuery(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeProducts(products) {
  const seen = new Set();
  const deduped = [];

  for (const product of Array.isArray(products) ? products : []) {
    const productQuery = normalizeQuery(product?.product_query);
    if (!productQuery) {
      continue;
    }

    const key = productQuery.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push({
      product_query: productQuery,
      confidence: Number(product?.confidence ?? 0),
      evidence: String(product?.evidence ?? '').trim()
    });
  }

  return deduped;
}

function extractOutputText(responseBody) {
  if (typeof responseBody?.output_text === 'string' && responseBody.output_text.trim()) {
    return responseBody.output_text;
  }

  const outputItems = Array.isArray(responseBody?.output) ? responseBody.output : [];

  for (const item of outputItems) {
    const contents = Array.isArray(item?.content) ? item.content : [];

    for (const content of contents) {
      if (typeof content?.text === 'string' && content.text.trim()) {
        return content.text;
      }
    }
  }

  return null;
}

export class OpenAIProductExtractor {
  constructor(config = {}) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4.1-mini';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1/responses';
    this.timeout = numberFromEnv(config.timeout, 45000);
  }

  buildPayload(transcript) {
    return {
      model: this.model,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: [
                'Voce recebe conversas reais de clientes de uma farmacia omnichannel.',
                'Extraia apenas os produtos que o cliente esta tentando encontrar ou comprar.',
                'Ignore saudacoes, dados pessoais, entrega, horario, receita, formas de pagamento e assuntos administrativos.',
                'Se houver mais de um produto pedido, retorne todos.',
                'A saida deve ser JSON estruturado.',
                'Cada product_query deve ser curta, objetiva e pronta para ser usada em uma busca de catalogo.',
                'Exemplos validos: "dipirona 1g 20 comprimidos", "fralda pampers g", "vitamina c efervescente".'
              ].join(' ')
            }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Conversa:\n${transcript}`
            }
          ]
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'product_search_extraction',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              has_product_search: { type: 'boolean' },
              notes: { type: 'string' },
              products: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    product_query: { type: 'string' },
                    confidence: { type: 'number' },
                    evidence: { type: 'string' }
                  },
                  required: ['product_query', 'confidence', 'evidence']
                }
              }
            },
            required: ['has_product_search', 'notes', 'products']
          }
        }
      }
    };
  }

  async extractProducts({ attendanceId, transcript }) {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY nao configurada');
    }

    if (!transcript || transcript.trim().length < 5) {
      return {
        attendanceId,
        hasProductSearch: false,
        notes: 'Transcript vazio ou curto demais para extracao',
        products: []
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.buildPayload(transcript)),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Falha na extracao com OpenAI (${response.status}): ${errorText}`);
      }

      const responseBody = await response.json();
      const outputText = extractOutputText(responseBody);

      if (!outputText) {
        throw new Error('Resposta da OpenAI nao trouxe output_text legivel');
      }

      const parsed = JSON.parse(outputText);
      const products = dedupeProducts(parsed?.products);

      return {
        attendanceId,
        hasProductSearch: parsed?.has_product_search === true && products.length > 0,
        notes: String(parsed?.notes ?? '').trim(),
        products
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
