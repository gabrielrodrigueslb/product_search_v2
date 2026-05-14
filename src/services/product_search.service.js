import { normalizeEan } from '../utils/normalize-ean.js';

export class ProductSearchService {
  constructor({ bancoUnicoProvider, clientProductProvider, productEnrichmentService }) {
    this.bancoUnicoProvider = bancoUnicoProvider;
    this.clientProductProvider = clientProductProvider;
    this.productEnrichmentService = productEnrichmentService;
  }

  async search({ query, vetorToken, cdfilial = 1 }) {
    const bancoUnicoProducts = await this.bancoUnicoProvider.searchByName(query);

    if (!Array.isArray(bancoUnicoProducts) || bancoUnicoProducts.length === 0) {
      return {
        found: false,
        total: 0,
        products: [],
        message: 'Nenhum produto encontrado no Banco Único'
      };
    }

    const eans = [...new Set(
      bancoUnicoProducts
        .map(product => normalizeEan(product.ean))
        .filter(Boolean)
    )];

    if (eans.length === 0) {
      return {
        found: false,
        total: 0,
        products: [],
        message: 'Nenhum EAN válido encontrado nos produtos do Banco Único'
      };
    }

    const clientProducts = await this.clientProductProvider.searchByEans(eans, {
      vetorToken,
      cdfilial
    });

    if (!Array.isArray(clientProducts) || clientProducts.length === 0) {
      return {
        found: false,
        total: 0,
        products: [],
        message: 'Nenhum produto encontrado no provider do cliente'
      };
    }

    const mergedProducts = this.productEnrichmentService.merge(bancoUnicoProducts, clientProducts);

    if (mergedProducts.length === 0) {
      return {
        found: false,
        total: 0,
        products: [],
        message: 'Nenhum produto compatível encontrado após cruzamento por EAN'
      };
    }

    return {
      found: true,
      total: mergedProducts.length,
      products: mergedProducts,
      message: 'Produtos encontrados com sucesso'
    };
  }
}
