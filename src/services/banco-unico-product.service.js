export class BancoUnicoProductService {
  constructor(bancoUnicoProvider) {
    this.bancoUnicoProvider = bancoUnicoProvider;
  }

  async searchByName(query) {
    const products = await this.bancoUnicoProvider.searchByName(query);

    if (!Array.isArray(products) || products.length === 0) {
      return {
        found: false,
        products: [],
        message: 'Nenhum produto encontrado no Banco Único'
      };
    }

    return {
      found: true,
      products,
      message: 'Produtos encontrados no Banco Único'
    };
  }
}
