import { normalizeEan } from '../utils/normalize-ean.js';

function formatEstoque(value) {
  const estoque = Number(value ?? 0);
  return Number.isFinite(estoque) ? estoque.toFixed(4) : '0.0000';
}

function calculateRelevanciaScore(product) {
  const similarity = Number(product?.similarity ?? 0);
  const tokenOverlap = Number(product?.tokenOverlap ?? 0);
  const exactEanMatch = product?.exactEanMatch === true ? 1 : 0;

  return Number((similarity * 10) + tokenOverlap + exactEanMatch).toFixed(3) * 1;
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== null && item !== undefined)
  );
}

function buildPrecos(clientProduct) {
  const precoSemDesconto = clientProduct?.preco ?? null;
  const precoComDesconto = clientProduct?.precoPromocional ?? null;
  const precoVenda = precoComDesconto ?? precoSemDesconto;
  const hasPrecoData = precoVenda != null || precoSemDesconto != null || precoComDesconto != null;

  if (!hasPrecoData) {
    return {};
  }

  return compactObject({
    preco_venda: precoVenda,
    tem_oferta_ativa: precoComDesconto != null,
    preco_sem_desconto: precoSemDesconto,
    preco_com_desconto: precoComDesconto,
    desconto_percentual: clientProduct?.descontoPercentual ?? null
  });
}

export class ProductEnrichmentService {
  merge(bancoUnicoProducts, clientProducts) {
    const clientProductsByEan = new Map();

    for (const product of clientProducts) {
      const normalizedEan = normalizeEan(product.ean);
      if (!normalizedEan) continue;

      clientProductsByEan.set(normalizedEan, product);
    }

    const mergedProducts = [];

    for (const bancoUnicoProduct of bancoUnicoProducts) {
      const normalizedEan = normalizeEan(bancoUnicoProduct.ean);
      if (!normalizedEan) continue;

      const clientProduct = clientProductsByEan.get(normalizedEan);
      if (!clientProduct) continue;

      if (Number(clientProduct.estoque ?? 0) < 2) {
        continue;
      }

      const precos = buildPrecos(clientProduct);

      mergedProducts.push({
        id: String(clientProduct.id ?? ''),
        codigo: clientProduct.codigo ?? null,
        codigo_barras: normalizedEan,
        descricao: bancoUnicoProduct.descricao,
        descricao_alpha7: clientProduct.descricao,
        principio_ativo: bancoUnicoProduct.principioAtivo || null,
        tipo_classificacao: clientProduct.tipoClassificacao || null,
        classificacao_id_origem: null,
        classificacao_nome_origem: clientProduct.classificacaoOrigem || null,
        embalagem_id: null,
        estoque_disponivel: formatEstoque(clientProduct.estoque),
        relevancia_score: calculateRelevanciaScore(bancoUnicoProduct),
        relacionado_busca: true,
        origem_busca: 'catalogo_externo_ean',
        match_externo: {
          id: bancoUnicoProduct.id,
          ean: normalizedEan,
          descricao_produto: bancoUnicoProduct.descricao,
          principio_ativo: bancoUnicoProduct.principioAtivo || null,
          classificacao: null,
          nome_social: bancoUnicoProduct.nomeSocial || null,
          fabricante: bancoUnicoProduct.fabricante || null,
          similarity: bancoUnicoProduct.similarity ?? null,
          token_overlap: bancoUnicoProduct.tokenOverlap ?? null,
          exact_ean_match: bancoUnicoProduct.exactEanMatch === true,
          relevanceScore: bancoUnicoProduct.relevanceScore ?? null,
          relevanceReason: bancoUnicoProduct.relevanceReason ?? null
        },
        ...(Object.keys(precos).length > 0 ? { precos } : {})
      });
    }

    return mergedProducts.sort((a, b) => {
      const precoA = Number(a?.precos?.preco_venda ?? Number.POSITIVE_INFINITY);
      const precoB = Number(b?.precos?.preco_venda ?? Number.POSITIVE_INFINITY);
      const similarityA = Number(a?.match_externo?.similarity ?? 0);
      const similarityB = Number(b?.match_externo?.similarity ?? 0);
      const relevanciaA = Number(a?.relevancia_score ?? 0);
      const relevanciaB = Number(b?.relevancia_score ?? 0);

      return precoA - precoB
        || similarityB - similarityA
        || relevanciaB - relevanciaA
        || String(a?.descricao || '').localeCompare(String(b?.descricao || ''));
    });
  }
}
