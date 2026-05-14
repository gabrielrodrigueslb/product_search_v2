import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { writeCsv } from './lib/csv.js';
import { OmnichannelClient } from './lib/omnichannel.client.js';
import { OpenAIProductExtractor } from './lib/openai-extractor.js';
import { ProductSearchClient } from './lib/product-search.client.js';

function numberFromEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function booleanFromEnv(value, fallback = false) {
  if (value == null) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'y', 'on'].includes(String(value).trim().toLowerCase());
}

function summarizeSearchResult(result) {
  const topProduct = result?.topProduct || {};

  return {
    search_found: result?.found === true,
    search_total: result?.total ?? 0,
    search_http_status: result?.httpStatus ?? null,
    search_message: result?.message ?? null,
    top_product_id: topProduct?.id ?? null,
    top_product_descricao: topProduct?.descricao ?? null,
    top_product_codigo_barras: topProduct?.codigo_barras ?? null,
    top_product_preco_venda: topProduct?.precos?.preco_venda ?? null
  };
}

async function runWithConcurrencyLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function execute() {
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
  await Promise.all(Array.from({ length: workerCount }, () => execute()));
  return results;
}

function buildOutputPaths(baseDir) {
  return {
    normalizedAttendancesJson: path.join(baseDir, '01-attendances-normalized.json'),
    extractedJson: path.join(baseDir, '02-product-extractions.json'),
    extractedCsv: path.join(baseDir, '02-product-extractions.csv'),
    evaluationsJson: path.join(baseDir, '03-search-evaluations.json'),
    evaluationsCsv: path.join(baseDir, '03-search-evaluations.csv'),
    summaryJson: path.join(baseDir, '04-summary.json')
  };
}

function flattenExtractions(extractions) {
  return extractions.flatMap(extraction => {
    if (!Array.isArray(extraction.products) || extraction.products.length === 0) {
      return [{
        attendance_id: extraction.attendanceId,
        created_at: extraction.createdAt,
        customer_name: extraction.customerName,
        channel: extraction.channel,
        message_count: extraction.messageCount,
        has_product_search: false,
        product_query: null,
        ai_confidence: null,
        ai_evidence: null,
        ai_notes: extraction.notes
      }];
    }

    return extraction.products.map(product => ({
      attendance_id: extraction.attendanceId,
      created_at: extraction.createdAt,
      customer_name: extraction.customerName,
      channel: extraction.channel,
      message_count: extraction.messageCount,
      has_product_search: extraction.hasProductSearch,
      product_query: product.product_query,
      ai_confidence: product.confidence,
      ai_evidence: product.evidence,
      ai_notes: extraction.notes
    }));
  });
}

function buildSummary(normalizedAttendances, extractionRows, evaluationRows) {
  const extractedProducts = extractionRows.filter(row => row.product_query);
  const foundRows = evaluationRows.filter(row => row.search_found === true);

  return {
    total_attendances: normalizedAttendances.length,
    attendances_with_messages: normalizedAttendances.filter(item => item.messageCount > 0).length,
    extracted_products: extractedProducts.length,
    searches_run: evaluationRows.length,
    searches_found: foundRows.length,
    hit_rate: evaluationRows.length > 0
      ? Number((foundRows.length / evaluationRows.length).toFixed(4))
      : 0
  };
}

function sanitizeAttendanceForOutput(attendance, includeTranscript) {
  if (includeTranscript) {
    return attendance;
  }

  return {
    attendanceId: attendance.attendanceId,
    createdAt: attendance.createdAt,
    customerName: attendance.customerName,
    channel: attendance.channel,
    messageCount: attendance.messageCount
  };
}

async function main() {
  const outputDir = path.resolve(process.cwd(), process.env.EVAL_OUTPUT_DIR || 'artifacts/omnichannel-eval');
  const includeTranscript = booleanFromEnv(process.env.EVAL_INCLUDE_TRANSCRIPT, false);
  const evaluationConcurrency = numberFromEnv(process.env.EVAL_MAX_PARALLEL_SEARCHES, 3);
  const limitAttendances = numberFromEnv(process.env.EVAL_LIMIT_ATTENDANCES, 50);
  const outputPaths = buildOutputPaths(outputDir);

  const omnichannelClient = new OmnichannelClient({
    attendancesUrl: process.env.OMNICHANNEL_ATTENDANCES_URL,
    messagesUrlTemplate: process.env.OMNICHANNEL_MESSAGES_URL_TEMPLATE,
    itemsPath: process.env.OMNICHANNEL_ITEMS_PATH,
    messagesItemsPath: process.env.OMNICHANNEL_MESSAGES_ITEMS_PATH,
    pageParam: process.env.OMNICHANNEL_PAGE_PARAM,
    pageSizeParam: process.env.OMNICHANNEL_PAGE_SIZE_PARAM,
    pageSize: process.env.OMNICHANNEL_PAGE_SIZE,
    maxPages: process.env.OMNICHANNEL_MAX_PAGES,
    timeout: process.env.OMNICHANNEL_TIMEOUT_MS,
    authHeader: process.env.OMNICHANNEL_AUTH_HEADER,
    authScheme: process.env.OMNICHANNEL_AUTH_SCHEME,
    token: process.env.OMNICHANNEL_API_TOKEN
  });

  const extractor = new OpenAIProductExtractor({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL,
    timeout: process.env.OPENAI_TIMEOUT_MS
  });

  const productSearchClient = new ProductSearchClient({
    baseUrl: process.env.PRODUCT_SEARCH_API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
    path: process.env.PRODUCT_SEARCH_API_PATH,
    vetorToken: process.env.PRODUCT_SEARCH_VETOR_TOKEN,
    cdfilial: process.env.PRODUCT_SEARCH_CDFILIAL,
    timeout: process.env.PRODUCT_SEARCH_TIMEOUT_MS
  });

  if (!process.env.PRODUCT_SEARCH_VETOR_TOKEN) {
    throw new Error('PRODUCT_SEARCH_VETOR_TOKEN nao configurado');
  }

  await mkdir(outputDir, { recursive: true });

  console.log('[1/4] Buscando atendimentos do omnichannel...');
  const normalizedAttendances = (await omnichannelClient.fetchAndNormalizeAttendances())
    .slice(0, limitAttendances);

  await writeFile(
    outputPaths.normalizedAttendancesJson,
    JSON.stringify(
      normalizedAttendances.map(item => sanitizeAttendanceForOutput(item, includeTranscript)),
      null,
      2
    ),
    'utf8'
  );

  console.log('[2/4] Extraindo produtos buscados com IA...');
  const extractions = [];

  for (const attendance of normalizedAttendances) {
    const extraction = await extractor.extractProducts({
      attendanceId: attendance.attendanceId,
      transcript: attendance.transcript
    });

    extractions.push({
      attendanceId: attendance.attendanceId,
      createdAt: attendance.createdAt,
      customerName: attendance.customerName,
      channel: attendance.channel,
      messageCount: attendance.messageCount,
      transcript: includeTranscript ? attendance.transcript : undefined,
      hasProductSearch: extraction.hasProductSearch,
      notes: extraction.notes,
      products: extraction.products
    });
  }

  await writeFile(outputPaths.extractedJson, JSON.stringify(extractions, null, 2), 'utf8');

  const extractionRows = flattenExtractions(extractions);
  await writeCsv(outputPaths.extractedCsv, extractionRows);

  console.log('[3/4] Executando buscas contra a API de produtos...');
  const extractedProducts = extractionRows.filter(row => row.product_query);
  const evaluations = await runWithConcurrencyLimit(
    extractedProducts,
    evaluationConcurrency,
    async row => {
      const result = await productSearchClient.search(row.product_query);

      return {
        ...row,
        ...summarizeSearchResult(result)
      };
    }
  );

  await writeFile(outputPaths.evaluationsJson, JSON.stringify(evaluations, null, 2), 'utf8');
  await writeCsv(outputPaths.evaluationsCsv, evaluations);

  const summary = buildSummary(normalizedAttendances, extractionRows, evaluations);
  await writeFile(outputPaths.summaryJson, JSON.stringify(summary, null, 2), 'utf8');

  console.log('[4/4] Resumo');
  console.table(summary);
  console.log(`Arquivos gerados em: ${outputDir}`);
}

main().catch(error => {
  console.error('Falha ao executar pipeline de avaliacao:', error.message);
  process.exitCode = 1;
});
