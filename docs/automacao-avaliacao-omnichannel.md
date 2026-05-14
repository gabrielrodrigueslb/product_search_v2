# Automacao de Avaliacao com Chats do Omnichannel

## Objetivo

Este fluxo automatiza um teste de vida real da API de busca de produtos a partir de conversas de clientes.

O pipeline faz:

1. busca atendimentos no omnichannel
2. normaliza as mensagens em um transcript
3. usa IA para extrair os produtos pedidos pelo cliente
4. salva as extracoes em `JSON` e `CSV`
5. executa a API local de busca de produtos para cada item extraido
6. salva o resultado da avaliacao em `JSON` e `CSV`
7. gera um resumo com taxa de acerto

## Script

O comando principal e:

```bash
npm run eval:omnichannel
```

## Como configurar

Preencha no `.env`:

- `OMNICHANNEL_ATTENDANCES_URL`: endpoint que lista os atendimentos
- `OMNICHANNEL_MESSAGES_URL_TEMPLATE`: endpoint de mensagens por atendimento, usando `{id}` quando as mensagens nao vierem embutidas
- `OMNICHANNEL_API_TOKEN`: token da API do omnichannel
- `OPENAI_API_KEY`: chave da IA que vai extrair o produto pedido
- `OPENAI_MODEL`: modelo usado na extracao
- `PRODUCT_SEARCH_API_BASE_URL`: URL da sua API de busca
- `PRODUCT_SEARCH_API_PATH`: rota do endpoint de busca
- `PRODUCT_SEARCH_VETOR_TOKEN`: token que a sua API local exige para consultar a Vetor
- `PRODUCT_SEARCH_CDFILIAL`: opcional
- `EVAL_INCLUDE_TRANSCRIPT`: quando `true`, inclui transcript e mensagens nos artefatos de auditoria

## Arquivos gerados

Por padrao, tudo vai para `artifacts/omnichannel-eval/`.

Arquivos:

- `01-attendances-normalized.json`: atendimentos normalizados
- `02-product-extractions.json`: resultado bruto da IA por atendimento
- `02-product-extractions.csv`: extracoes em formato tabular
- `03-search-evaluations.json`: resultado bruto da busca por item extraido
- `03-search-evaluations.csv`: avaliacao em formato tabular
- `04-summary.json`: totais e taxa de acerto

Quando `EVAL_INCLUDE_TRANSCRIPT=false`, os artefatos evitam exportar o texto completo da conversa por padrao.

## Formato da avaliacao

Cada linha avaliada representa um produto extraido pela IA de um atendimento.

Campos importantes:

- `attendance_id`
- `product_query`
- `ai_confidence`
- `search_found`
- `search_total`
- `top_product_descricao`
- `top_product_codigo_barras`
- `top_product_preco_venda`

## Adaptacao da API do omnichannel

Como cada omnichannel devolve um payload diferente, o script foi feito para ser flexivel:

- tenta localizar arrays em chaves comuns como `data.items`, `data.results`, `items`, `results`, `attendances` e `atendimentos`
- tenta localizar mensagens em chaves comuns como `messages`, `mensagens`, `chat.messages` e `conversation.messages`
- aceita paginação por `page` e `limit`

Se sua API tiver um formato diferente, o ponto principal para ajustar e:

- [scripts/lib/omnichannel.client.js](/Users/gabrieltakaki/projects/unicocontato/product_search_v2/scripts/lib/omnichannel.client.js:1)

## Recomendacao pratica

O jeito mais seguro de começar e:

1. rodar com `EVAL_LIMIT_ATTENDANCES=10`
2. validar manualmente o `01-attendances-normalized.json`
3. conferir se a IA extraiu o produto certo no `02-product-extractions.csv`
4. revisar os casos em que `search_found=false`
5. ajustar o prompt ou o normalizador do omnichannel

## Melhorias futuras

Algumas evolucoes naturais para esse pipeline:

- marcar se o melhor resultado realmente corresponde ao produto pedido, nao apenas se a busca retornou algo
- separar metricas por canal, atendente, loja ou periodo
- criar whitelist de stopwords e correcoes de abreviacoes farmaceuticas
- salvar tambem os casos sem produto buscado para auditoria de classificacao
- transformar isso em job agendado diario ou semanal
