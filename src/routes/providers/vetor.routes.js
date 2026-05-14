import express from 'express';
import { ProductController } from '../../controllers/product.controller.js';
import { ProductSearchService } from '../../services/product_search.service.js';
import { ProductEnrichmentService } from '../../services/product_enrichment.service.js';
import { BancoUnicoProvider } from '../../providers/banco_unico/banco_unico.provider.js';
import { VetorProvider } from '../../providers/vetor/vetor.provider.js';

const router = express.Router();

const bancoUnicoProvider = new BancoUnicoProvider();
const vetorProvider = new VetorProvider();
const productEnrichmentService = new ProductEnrichmentService();

const productSearchService = new ProductSearchService({
  bancoUnicoProvider,
  clientProductProvider: vetorProvider,
  productEnrichmentService
});

const productController = new ProductController(productSearchService);

router.post('/products/search', async (req, res) => {
  await productController.search(req, res);
});

export default router;







