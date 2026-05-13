import axios from 'axios';
import 'dotenv/config';
import { mapVetorProduct } from './vetor.mapper.js';

const DEFAULT_BASE_URL = 'https://integracao.zetti.dev';
const PRODUTOS_CONSULTA_PATH = '/api/ecommerce/produtos/consulta';
const MAX_EANS_PER_REQUEST = 10;

function escapeODataString(value) {
  return String(value || '').replace(/'/g, "''");
}

function splitInChunks(items, chunkSize) {
  const chunks = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

function buildCodigoBarrasFilter(eans) {
  return eans
    .map(ean => `codigoBarras eq '${escapeODataString(ean)}'`)
    .join(' or ');
}

function buildConsultaFilter(eans, cdfilial) {
  const filters = [];
  const codigoBarrasFilter = buildCodigoBarrasFilter(eans);

  if (codigoBarrasFilter) {
    filters.push(`(${codigoBarrasFilter})`);
  }

  if (Number.isInteger(cdfilial)) {
    filters.push(`cdFilial eq ${cdfilial}`);
  }

  return filters.join(' and ');
}

export class VetorProvider {
  constructor() {
    this.baseURL = process.env.VETOR_API_BASE_URL || DEFAULT_BASE_URL;
  }

  createClient(vetorToken) {
    return axios.create({
      baseURL: this.baseURL,
      timeout: 60000,
      headers: {
        Authorization: `ApiKey ${vetorToken}`
      }
    });
  }

  async searchByEans(eans, options = {}) {
    const vetorToken = String(options?.vetorToken || '').trim();
    const cdfilial = Number.isInteger(Number(options?.cdfilial))
      ? Number(options.cdfilial)
      : null;
    const uniqueEans = [...new Set(
      (Array.isArray(eans) ? eans : [])
        .map(value => String(value || '').trim())
        .filter(Boolean)
    )];

    if (uniqueEans.length === 0) {
      return [];
    }

    if (!vetorToken) {
      throw new Error('Token da Vetor não informado');
    }

    try {
      const api = this.createClient(vetorToken);
      const chunks = splitInChunks(uniqueEans, MAX_EANS_PER_REQUEST);
      const allItems = [];

      for (const chunk of chunks) {
        const response = await api.get(PRODUTOS_CONSULTA_PATH, {
          params: {
            $filter: buildConsultaFilter(chunk, cdfilial),
            $top: 500
          }
        });

        const items = Array.isArray(response.data?.data)
          ? response.data.data
          : [];

        allItems.push(...items);
      }

      return allItems.map(mapVetorProduct);
    } catch (error) {
      const status = error?.response?.status;
      const responseMessage = error?.response?.data?.msg || error?.response?.data?.message;
      console.error(
        `Erro ao buscar produtos na Vetor${status ? ` (HTTP ${status})` : ''}:`,
        responseMessage || error.message
      );
      throw error;
    }
  }
}
