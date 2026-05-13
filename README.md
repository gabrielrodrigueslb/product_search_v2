# Product Search V2

API Node.js para buscar produtos no Banco Único, cruzar por EAN na Vetor e retornar apenas os produtos encontrados no cliente.

## Estrutura de rotas

A API agora usa rotas por provider para facilitar a entrada de novos conectores no futuro.

### Vetor

```http
POST /providers/vetor/products/search
```

## Fluxo

1. Recebe a busca por `query`
2. Consulta o Banco Único em `POST /api/products/search`
3. Extrai os `EANs` retornados
4. Consulta a Vetor por `codigoBarras`
5. Opcionalmente filtra a Vetor por `cdFilial`
6. Faz o merge por `EAN`
7. Retorna os produtos no formato final enxuto

## Requisitos

- Node.js 20+ recomendado
- Token válido da Vetor enviado no body da requisição

## Instalação

```bash
npm install
```

## Configuração

Crie um `.env` com base no `.env.example`.

### Variáveis de ambiente

- `PORT`: porta local da API
- `BANCO_UNICO_API_BASE_URL`: base URL do Banco Único
- `VETOR_API_BASE_URL`: base URL da Vetor
- `VETOR_MAX_EANS_PER_REQUEST`: quantidade de EANs por lote enviado para a Vetor
- `VETOR_MAX_PARALLEL_REQUESTS`: quantidade máxima de lotes consultados em paralelo

## Execução

Modo desenvolvimento:

```bash
npm run dev
```

Modo produção:

```bash
npm start
```

## Health Check

```http
GET /health
```

Resposta:

```json
{
  "status": "ok"
}
```

## Endpoint da Vetor

```http
POST /providers/vetor/products/search
Content-Type: application/json
```

### Body

- `query`: obrigatório, texto da busca
- `vetorToken`: obrigatório, token da Vetor
- `cdfilial`: opcional, filial específica para consultar estoque e preço

Exemplo:

```json
{
  "query": "dipirona",
  "vetorToken": "SEU_TOKEN_DA_VETOR",
  "cdfilial": 3
}
```

Também é aceito `cdFilial` no lugar de `cdfilial`.

## Exemplo de resposta

```json
{
  "found": true,
  "total": 1,
  "products": [
    {
      "id": "357927",
      "codigo": 28049,
      "codigo_barras": "7899547500363",
      "descricao": "Dipirona Sodica 1000mg 20 Comprimidos",
      "descricao_alpha7": "DIPIRONA 1G 20CP(PRA)",
      "principio_ativo": "Dipirona",
      "tipo_classificacao": "GENERICO",
      "classificacao_id_origem": null,
      "classificacao_nome_origem": "GENERICOS",
      "embalagem_id": null,
      "estoque_disponivel": "2.0000",
      "relevancia_score": 11.081,
      "relacionado_busca": true,
      "origem_busca": "catalogo_externo_ean",
      "match_externo": {
        "id": "29910237-dd3f-40ea-99c9-3512e5023138",
        "ean": "7899547500363",
        "descricao_produto": "Dipirona Sodica 1000mg 20 Comprimidos",
        "principio_ativo": "Dipirona",
        "classificacao": null,
        "nome_social": "Dipirona Sodica",
        "fabricante": "Prati Donaduzzi & CIA Ltda",
        "similarity": 0.6081256867172622,
        "token_overlap": 5,
        "exact_ean_match": false
      },
      "precos": {
        "preco_venda": 24.98,
        "tem_oferta_ativa": false,
        "preco_sem_desconto": 24.98
      }
    }
  ],
  "message": "Produtos encontrados com sucesso"
}
```

## Regras de retorno

- A API só retorna produtos encontrados na Vetor
- O merge entre Banco Único e Vetor é feito por `EAN`
- O nome principal em `descricao` vem do Banco Único
- A descrição local do cliente fica em `descricao_alpha7`
- O bloco `precos` só inclui campos que realmente existem na integração atual com a Vetor
- Os produtos são ordenados por:
  1. menor preço
  2. maior similaridade
  3. maior relevância
  4. descrição em ordem alfabética

## Respostas de erro

### Query ausente

```json
{
  "found": false,
  "products": [],
  "message": "Parâmetro \"query\" é obrigatório"
}
```

### Token ausente

```json
{
  "found": false,
  "products": [],
  "message": "Parâmetro \"vetorToken\" é obrigatório"
}
```

### Filial inválida

```json
{
  "found": false,
  "products": [],
  "message": "Parâmetro \"cdfilial\" deve ser um número inteiro"
}
```

### Nenhum produto encontrado

```json
{
  "found": false,
  "total": 0,
  "products": [],
  "message": "Nenhum produto encontrado no provider do cliente"
}
```
