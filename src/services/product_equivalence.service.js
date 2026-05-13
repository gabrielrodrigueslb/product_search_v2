import { normalizeEan } from '../utils/normalize-ean.js';

export class ProductEquivalenceService {
  hasCommonEan(bancoUnicoProducts, clientProducts) {
    const eansCliente = new Set(
      (clientProducts || []).map(product => normalizeEan(product.ean)).filter(Boolean)
    );

    return (bancoUnicoProducts || []).some(product => eansCliente.has(normalizeEan(product.ean)));
  }
}
