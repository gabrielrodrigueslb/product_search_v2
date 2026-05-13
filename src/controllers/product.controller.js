export class ProductController {
  constructor(productSearchService) {
    this.productSearchService = productSearchService;
  }

  async search(req, res) {
    try {
      const { query, vetorToken, cdfilial, cdFilial } = req.body || {};

      if (!query || !String(query).trim()) {
        return res.status(400).json({
          found: false,
          products: [],
          message: 'Parâmetro "query" é obrigatório'
        });
      }

      if (!vetorToken || !String(vetorToken).trim()) {
        return res.status(400).json({
          found: false,
          products: [],
          message: 'Parâmetro "vetorToken" é obrigatório'
        });
      }

      const filialValue = cdfilial ?? cdFilial;

      if (
        filialValue != null
        && String(filialValue).trim() !== ''
        && !Number.isInteger(Number(filialValue))
      ) {
        return res.status(400).json({
          found: false,
          products: [],
          message: 'Parâmetro "cdfilial" deve ser um número inteiro'
        });
      }

      const result = await this.productSearchService.search({
        query: String(query).trim(),
        vetorToken: String(vetorToken).trim(),
        cdfilial: filialValue == null || String(filialValue).trim() === ''
          ? null
          : Number(filialValue)
      });

      if (!result.found) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        found: false,
        products: [],
        message: 'Erro ao processar busca',
        details: error.message
      });
    }
  }
}
