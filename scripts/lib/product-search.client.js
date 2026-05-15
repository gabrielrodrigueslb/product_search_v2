import axios from 'axios';

function numberFromEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOptionalInteger(value) {
  if (value == null || String(value).trim() === '') {
    return 1;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : 1;
}

export class ProductSearchClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl;
    this.path = config.path || '/providers/vetor/products/search/semantic';
    this.vetorToken = config.vetorToken;
    this.cdfilial = config.cdfilial ?? 1;
    this.timeout = numberFromEnv(config.timeout, 30000);

    this.api = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      },
      validateStatus: () => true
    });
  }

  async search(query) {
    const payload = {
      query,
      vetorToken: this.vetorToken
    };

    const cdfilial = parseOptionalInteger(this.cdfilial);

    payload.cdfilial = cdfilial;

    const response = await this.api.post(this.path, payload);
    const body = response.data || {};
    const products = Array.isArray(body?.products) ? body.products : [];
    const topProduct = products[0] || null;
    const topProducts = products.slice(0, 3);

    return {
      httpStatus: response.status,
      found: body?.found === true,
      total: Number(body?.total ?? products.length ?? 0),
      message: body?.message || null,
      topProduct,
      topProducts,
      raw: body
    };
  }
}
