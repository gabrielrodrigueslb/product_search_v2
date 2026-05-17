export function mapBancoUnicoProduct(item) {
  return {
    source: 'banco_unico',
    id: item?.id || null,
    ean: item?.ean || null,
    descricao: item?.descricaoProduto || null,
    nomeSocial: item?.nomeSocial || null,
    principioAtivo: item?.principioAtivo || null,
    fabricante: item?.fabricante || null,
    similarity: item?.similarity ?? null,
    tokenOverlap: item?.tokenOverlap ?? null,
    exactEanMatch: item?.exactEanMatch === true,
    relevanceScore: item?.relevanceScore ?? null,
    relevanceReason: item?.relevanceReason ?? null,
    detalhes: item?.detalhes || null,
    raw: item
  };
}
