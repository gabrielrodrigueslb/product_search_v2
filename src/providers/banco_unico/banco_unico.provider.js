import axios from 'axios';
import 'dotenv/config';
import { mapBancoUnicoProduct } from './banco_unico.mapper.js';

export class BancoUnicoProvider {
  constructor() {
    this.api = axios.create({
      baseURL: process.env.BANCO_UNICO_API_BASE_URL || 'https://unicocontato.tech/banco-unico',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async searchByName(query) {
    try {
      const response = await this.api.post('/api/products/search', {
        query,
        limit: 50
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
