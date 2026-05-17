import axios from 'axios';
import 'dotenv/config';
import { mapBancoUnicoProduct } from './banco_unico.mapper.js';

function positiveNumberFromEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export class BancoUnicoProvider {
  constructor() {
    this.timeout = positiveNumberFromEnv(process.env.BANCO_UNICO_TIMEOUT_MS, 60000);
    this.searchLimit = positiveNumberFromEnv(process.env.BANCO_UNICO_SEARCH_LIMIT, 20);

    this.api = axios.create({
      baseURL: process.env.BANCO_UNICO_API_BASE_URL || 'https://unicocontato.tech/banco-unico',
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async searchByName(query) {
    try {
      const response = await this.api.post('/api/products/search', {
        query,
        limit: this.searchLimit
      });

      const results = Array.isArray(response.data?.results)
        ? response.data.results
        : [];

      return results.map(mapBancoUnicoProduct);
    } catch (error) {
      console.error('Erro ao buscar produtos no Banco Único:', error.message);
      throw error;
    }
  }
}
