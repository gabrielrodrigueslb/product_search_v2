import axios from 'axios';
import 'dotenv/config';
import { mapVetorProduct } from './vetor.mapper.js';

const DEFAULT_BASE_URL = 'https://integracao.zetti.dev';
const PRODUTOS_CONSULTA_PATH = '/api/ecommerce/produtos/consulta';
const DEFAULT_MAX_EANS_PER_REQUEST = process.env.VETOR_MAX_EANS_PER_REQUEST || 15;
const DEFAULT_MAX_PARALLEL_REQUESTS = process.env.VETOR_MAX_PARALLEL_REQUESTS || 4;

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

function parseOptionalInteger(value) {
  if (value == null || String(value).trim() === '') {
    return 1;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : 1;
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

async function runWithConcurrencyLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function runWorker() {
    while (true) {
      const currentIndex = cursor;
      cursor += 1;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  return results;
}

function flattenVetorResponseItems(response) {
  return Array.isArray(response.data?.data)
    ? response.data.data
    : [];
}

export class VetorProvider {
  constructor() {
    this.baseURL = process.env.VETOR_API_BASE_URL || DEFAULT_BASE_URL;
    this.maxEansPerRequest = Number(process.env.VETOR_MAX_EANS_PER_REQUEST) || DEFAULT_MAX_EANS_PER_REQUEST;
    this.maxParallelRequests = Number(process.env.VETOR_MAX_PARALLEL_REQUESTS) || DEFAULT_MAX_PARALLEL_REQUESTS;
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

  async fetchChunk(api, chunk, cdfilial) {
    const response = await api.get(PRODUTOS_CONSULTA_PATH, {
      params: {
        $filter: buildConsultaFilter(chunk, cdfilial),
        $top: 500
      }
    });

    return flattenVetorResponseItems(response);
  }

  async fetchChunkWithFallback(api, chunk, cdfilial) {
    const items = await this.fetchChunk(api, chunk, cdfilial);

    if (items.length > 0 || chunk.length <= 1) {
      return items;
    }

    console.warn(
      `Consulta Vetor em lote retornou vazia para ${chunk.length} EANs; tentando fallback individual.`
    );

    const fallbackResults = await Promise.all(
      chunk.map(ean => this.fetchChunk(api, [ean], cdfilial))
    );

    return fallbackResults.flat();
  }

  async searchByEans(eans, options = {}) {
    const vetorToken = String(options?.vetorToken || '').trim();
    const cdfilial = parseOptionalInteger(options?.cdfilial);
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
      const chunks = splitInChunks(uniqueEans, this.maxEansPerRequest);
      const chunkResults = await runWithConcurrencyLimit(
        chunks,
        this.maxParallelRequests,
        chunk => this.fetchChunkWithFallback(api, chunk, cdfilial)
      );

      return chunkResults
        .flat()
        .map(mapVetorProduct);
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
