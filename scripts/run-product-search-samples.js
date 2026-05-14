import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { ProductSearchClient } from './lib/product-search.client.js';

const TARGET_QUERY_COUNT = 1000;

const CORE_SAMPLE_QUERIES = [
  'dipirona',
  'paracetamol',
  'ibuprofeno',
  'nimesulida',
  'diclofenaco',
  'dorflex',
  'buscopan',
  'omeprazol',
  'pantoprazol',
  'loratadina',
  'cetirizina',
  'desloratadina',
  'amoxicilina',
  'azitromicina',
  'cefalexina',
  'simeticona',
  'bromoprida',
  'metoclopramida',
  'ondansetrona',
  'rinosoro',
  'soro fisiologico',
  'vitamina c',
  'vitamina d',
  'complexo b',
  'multivitaminico',
  'neosaldina',
  'novalgina',
  'cimegripe',
  'benegrip',
  'xarope guaco',
  'melatonina',
  'creatina',
  'whey protein',
  'fralda geriatrica',
  'fralda infantil',
  'absorvente',
  'preservativo',
  'alcool 70',
  'termometro',
  'aparelho de pressao',
  'protetor solar',
  'hidratante corporal',
  'shampoo anticaspa',
  'sabonete liquido',
  'pomada para assadura',
  'sal de frutas',
  'lactase',
  'probiotico',
  'colageno',
  'magnesio',
  'amoxicilina clavulanato',
  'levofloxacino',
  'ciprofloxacino',
  'nitrofurantoina',
  'fluconazol',
  'aciclovir',
  'prednisona',
  'dexametasona',
  'betametasona',
  'dexclorfeniramina',
  'fexofenadina',
  'bilastina',
  'levocetirizina',
  'montelucaste',
  'budesonida nasal',
  'mometasona nasal',
  'naproxeno',
  'meloxicam',
  'celecoxibe',
  'torsilax',
  'tandrilax',
  'dipirona sodica',
  'aspirina',
  'aas infantil',
  'engov',
  'dramim',
  'vonau',
  'plasil',
  'luftal',
  'epocler',
  'imosec',
  'enterogermina',
  'floratil',
  'lactulona',
  'dulcolax',
  'tamarine',
  'sorine',
  'naridrin',
  'vick vaporub',
  'pastilha valda',
  'strepsils',
  'benalet',
  'acetilcisteina',
  'ambroxol',
  'xarope expectorante',
  'nebulizador',
  'inalador',
  'oximetro',
  'curativo',
  'gaze esteril',
  'esparadrapo',
  'band aid',
  'algodao',
  'cotonete',
  'luva descartavel',
  'mascara cirurgica',
  'seringa',
  'escova dental',
  'creme dental',
  'enxaguante bucal',
  'fio dental',
  'escova interdental',
  'clareador dental',
  'solucao para lentes',
  'colirio lubrificante',
  'colirio antialergico',
  'agua boricada',
  'pomada cicatrizante',
  'bepantol',
  'hipoglos',
  'pomada para queimadura',
  'antiacido',
  'eparema',
  'biotina',
  'omega 3',
  'zinco',
  'ferro',
  'acido folico',
  'calcio',
  'coenzima q10',
  'glucosamina',
  'condroitina',
  'vitamina b12',
  'vitamina a',
  'vitamina e',
  'polivitaminico infantil',
  'suplemento alimentar infantil',
  'formula infantil',
  'leite em po infantil',
  'chupeta',
  'mamadeira',
  'lenco umedecido',
  'talco antisseptico',
  'sabonete em barra',
  'sabonete intimo',
  'desodorante aerosol',
  'desodorante roll on',
  'hidratante labial',
  'protetor labial',
  'creme para maos',
  'creme para os pes',
  'creme para rachadura',
  'agua micelar',
  'demaquilante',
  'protetor facial',
  'filtro solar infantil',
  'repelente',
  'repelente infantil',
  'pos sol',
  'gel fixador',
  'condicionador',
  'mascara capilar',
  'shampoo infantil',
  'shampoo hidratante',
  'shampoo antiqueda',
  'tonico capilar',
  'minoxidil',
  'sabonete para acne',
  'gel de limpeza facial',
  'creme antiacne',
  'acido salicilico',
  'niacinamida',
  'retinol',
  'clareador facial',
  'antirrugas',
  'creme para area dos olhos',
  'removedor de esmalte',
  'esmalte',
  'algodao em disco',
  'sabonete de glicerina',
  'antitranspirante',
  'adocante',
  'cha de camomila',
  'cha de boldo',
  'mel',
  'propolis',
  'gengibre',
  'canela em capsulas',
  'maca peruana',
  'tribulus',
  'cafeina',
  'pre treino',
  'albumina',
  'miconazol',
  'clotrimazol',
  'cetoconazol',
  'soro oral',
  'protetor diario',
  'fralda pants',
  'pomada analgesica'
];

const MEDICINE_TERMS = [
  'dipirona',
  'paracetamol',
  'ibuprofeno',
  'nimesulida',
  'diclofenaco',
  'cetirizina',
  'loratadina',
  'desloratadina',
  'dexclorfeniramina',
  'fexofenadina',
  'levocetirizina',
  'amoxicilina',
  'amoxicilina clavulanato',
  'azitromicina',
  'cefalexina',
  'ciprofloxacino',
  'levofloxacino',
  'nitrofurantoina',
  'fluconazol',
  'aciclovir',
  'prednisona',
  'dexametasona',
  'betametasona',
  'budesonida',
  'mometasona',
  'omeprazol',
  'pantoprazol',
  'simeticona',
  'bromoprida',
  'metoclopramida',
  'ondansetrona',
  'acetilcisteina',
  'ambroxol',
  'miconazol',
  'clotrimazol',
  'cetoconazol',
  'minoxidil',
  'montelucaste',
  'meloxicam',
  'celecoxibe'
];

const MEDICINE_VARIANTS = [
  '500mg',
  '1g',
  'gotas',
  'xarope',
  'comprimido',
  'capsula',
  'suspensao',
  'solucao'
];

const BRANDED_QUERY_GROUPS = [
  { term: 'fralda', variants: ['babysec', 'pampers', 'huggies', 'pom pom', 'turma da monica', 'mamy poko', 'cremer', 'personal'] },
  { term: 'fralda geriatrica', variants: ['bigfral', 'plenitud', 'tena', 'needs'] },
  { term: 'lenco umedecido', variants: ['huggies', 'johnsons baby', 'turma da monica', 'babysec', 'pampers'] },
  { term: 'shampoo', variants: ['pantene', 'clear', 'head shoulders', 'elseve', 'dove', 'tresemme', 'johnsons baby', 'seda'] },
  { term: 'condicionador', variants: ['pantene', 'clear', 'head shoulders', 'elseve', 'dove', 'tresemme', 'johnsons baby', 'seda'] },
  { term: 'shampoo anticaspa', variants: ['clear', 'head shoulders', 'vichy', 'darrow', 'principia'] },
  { term: 'shampoo infantil', variants: ['johnsons baby', 'baby dove', 'granado', 'tralala', 'mustela'] },
  { term: 'shampoo antiqueda', variants: ['vichy', 'darrow', 'pantene', 'tresemme', 'elseve'] },
  { term: 'sabonete', variants: ['dove', 'lux', 'protex', 'nivea', 'granado', 'phebo', 'johnsons baby', 'palmolive'] },
  { term: 'sabonete liquido', variants: ['dove', 'protex', 'granado', 'johnsons baby', 'nivea', 'palmolive'] },
  { term: 'sabonete intimo', variants: ['lucretin', 'dermacyd', 'intimus', 'nivea'] },
  { term: 'hidratante corporal', variants: ['nivea', 'cerave', 'cetaphil', 'johnsons', 'monange', 'neutrogena'] },
  { term: 'hidratante facial', variants: ['cerave', 'cetaphil', 'neutrogena', 'nivea', 'la roche'] },
  { term: 'protetor solar', variants: ['nivea sun', 'sundown', 'episol', 'la roche', 'cenoura bronze', 'isdin'] },
  { term: 'filtro solar infantil', variants: ['nivea sun', 'sundown', 'episol', 'mustela'] },
  { term: 'creme dental', variants: ['colgate', 'oral b', 'sensodyne', 'closeup', 'elmex'] },
  { term: 'escova dental', variants: ['colgate', 'oral b', 'curaprox', 'condor'] },
  { term: 'enxaguante bucal', variants: ['listerine', 'colgate plax', 'oral b', 'malvatricin'] },
  { term: 'fio dental', variants: ['colgate', 'oral b', 'sanifill', 'needs'] },
  { term: 'absorvente', variants: ['always', 'intimus', 'carefree', 'sempre livre', 'sym'] },
  { term: 'protetor diario', variants: ['carefree', 'intimus', 'sym', 'sempre livre'] },
  { term: 'desodorante', variants: ['rexona', 'nivea', 'dove', 'above', 'axe', 'old spice'] },
  { term: 'antitranspirante', variants: ['rexona', 'nivea', 'dove', 'above', 'axe', 'old spice'] },
  { term: 'formula infantil', variants: ['nan', 'aptamil', 'enfamil', 'nestogeno', 'milnutri'] },
  { term: 'leite em po infantil', variants: ['ninho', 'nan', 'aptamil', 'nestogeno', 'milnutri'] },
  { term: 'mamadeira', variants: ['avent', 'nuk', 'mam', 'lillo'] },
  { term: 'chupeta', variants: ['avent', 'nuk', 'mam', 'lillo'] },
  { term: 'agua mineral', variants: ['crystal', 'indaia', 'minalba', 'bonafont', 'sao lourenco', 'acquissima'] },
  { term: 'agua de coco', variants: ['kero coco', 'sococo', 'obrigado', 'ducoco'] },
  { term: 'isotonico', variants: ['gatorade', 'powerade', 'marathon', 'i9'] },
  { term: 'refrigerante', variants: ['coca cola', 'guarana antarctica', 'pepsi', 'sprite', 'fanta', 'schweppes'] },
  { term: 'chocolate', variants: ['lacta', 'garoto', 'nestle', 'hersheys'] },
  { term: 'barra de cereal', variants: ['trio', 'nesfit', 'nutry', 'kobber'] },
  { term: 'cafe', variants: ['3 coracoes', 'pilao', 'melitta', 'caboclo'] },
  { term: 'adocante', variants: ['zero cal', 'adocyl', 'linea', 'lowcucar'] },
  { term: 'creatina', variants: ['max titanium', 'integralmedica', 'dark lab', 'growth', 'dux', 'black skull', 'adaptogen', 'probiotica'] },
  { term: 'whey protein', variants: ['max titanium', 'integralmedica', 'growth', 'dux', 'black skull', 'probiotica', 'dark lab', 'adaptogen'] },
  { term: 'colageno', variants: ['sanavita', 'essential nutrition', 'vitafor', 'renova be', 'hidrolisado', 'verisol'] },
  { term: 'melatonina', variants: ['lavitan', 'equaliv', 'nutralin', 'sundown', 'vitafor', 'catarinense'] },
  { term: 'omega 3', variants: ['lavitan', 'equaliv', 'sundown', 'vitafor', 'essential nutrition'] },
  { term: 'probiotico', variants: ['floratil', 'enterogermina', 'simcaps', 'culturelle', 'vitafor'] },
  { term: 'repelente', variants: ['exposis', 'off', 'sbp', 'xo inseto', 'repelex'] },
  { term: 'repelente infantil', variants: ['exposis', 'off baby', 'johnsons baby', 'sbp', 'xo inseto'] },
  { term: 'pomada para assadura', variants: ['hipoglos', 'bepantol baby', 'desitin', 'babymed'] },
  { term: 'pomada cicatrizante', variants: ['bepantol', 'cicaplast', 'nebacetin', 'cicatenol', 'dermoprotetor'] },
  { term: 'colirio lubrificante', variants: ['systane', 'refresh', 'moura brasil', 'hyabak'] },
  { term: 'solucao para lentes', variants: ['renu', 'opti free', 'bio true', 'blink'] }
];

const SIZE_VARIANT_GROUPS = [
  { term: 'fralda babysec', variants: ['rn', 'p', 'm', 'g', 'xg', 'xxg'] },
  { term: 'fralda pampers', variants: ['rn', 'p', 'm', 'g', 'xg', 'xxg'] },
  { term: 'fralda huggies', variants: ['rn', 'p', 'm', 'g', 'xg', 'xxg'] },
  { term: 'fralda pom pom', variants: ['rn', 'p', 'm', 'g', 'xg', 'xxg'] },
  { term: 'fralda turma da monica', variants: ['rn', 'p', 'm', 'g', 'xg', 'xxg'] },
  { term: 'fralda mamy poko', variants: ['rn', 'p', 'm', 'g', 'xg', 'xxg'] },
  { term: 'fralda cremer', variants: ['rn', 'p', 'm', 'g', 'xg', 'xxg'] },
  { term: 'fralda personal', variants: ['rn', 'p', 'm', 'g', 'xg', 'xxg'] },
  { term: 'fralda pants pampers', variants: ['m', 'g', 'xg', 'xxg'] },
  { term: 'fralda pants huggies', variants: ['m', 'g', 'xg', 'xxg'] },
  { term: 'fralda babysec shortinho', variants: ['m', 'g', 'xg', 'xxg'] },
  { term: 'agua mineral', variants: ['500ml', '1l', '1,5l', '2l', 'sem gas', 'com gas', 'copo 200ml'] },
  { term: 'agua mineral crystal', variants: ['500ml', '1,5l', 'sem gas', 'com gas', 'pack 6 unidades'] },
  { term: 'agua mineral minalba', variants: ['500ml', '1,5l', 'sem gas', 'com gas', 'pack 6 unidades'] },
  { term: 'agua mineral indaia', variants: ['500ml', '1,5l', 'sem gas', 'com gas', 'pack 6 unidades'] },
  { term: 'agua de coco', variants: ['200ml', '330ml', '1l', 'sem acucar', 'caixa'] },
  { term: 'refrigerante coca cola', variants: ['lata', '600ml', '1l', '2l', 'zero'] },
  { term: 'refrigerante guarana antarctica', variants: ['lata', '600ml', '1l', '2l'] },
  { term: 'energetico red bull', variants: ['250ml', 'zero', 'tropical', 'melancia'] },
  { term: 'energetico monster', variants: ['473ml', 'zero', 'mango loco', 'ultra'] },
  { term: 'isotonico gatorade', variants: ['500ml', 'limao', 'uva', 'laranja'] },
  { term: 'cafe 3 coracoes', variants: ['tradicional', 'extra forte', 'capsula', 'soluvel'] },
  { term: 'whey protein max titanium', variants: ['chocolate', 'baunilha', 'morango', 'cookies'] },
  { term: 'whey protein integralmedica', variants: ['chocolate', 'baunilha', 'morango', 'cookies'] },
  { term: 'creatina max titanium', variants: ['150g', '300g', '500g'] },
  { term: 'creatina integralmedica', variants: ['150g', '300g', '500g'] },
  { term: 'formula infantil nan', variants: ['1', '2', '3', 'comfort'] },
  { term: 'formula infantil aptamil', variants: ['1', '2', '3', 'premium'] },
  { term: 'formula infantil enfamil', variants: ['1', '2', '3', 'premium'] },
  { term: 'leite em po ninho', variants: ['integral', 'forti+', 'zero lactose', 'instantaneo'] },
  { term: 'protetor solar nivea sun', variants: ['fps 30', 'fps 50', 'fps 70', 'spray'] },
  { term: 'protetor solar sundown', variants: ['fps 30', 'fps 50', 'fps 70', 'spray'] },
  { term: 'shampoo pantene', variants: ['hidratacao', 'liso extremo', 'anticaspa', 'reconstrucao'] },
  { term: 'shampoo elseve', variants: ['hidra hialuronico', 'reparacao total', 'oleo extraordinario', 'color vive'] },
  { term: 'shampoo clear', variants: ['anticaspa', 'men', 'sports men', 'hidratacao'] },
  { term: 'shampoo head shoulders', variants: ['anticaspa', 'menthol', 'hidratacao', 'men'] }
];

const HOUSEHOLD_AND_DEVICE_GROUPS = [
  { term: 'alcool 70', variants: ['itaja', 'needs', 'farmax', 'copex'] },
  { term: 'alcool em gel', variants: ['itaja', 'needs', 'asseptgel', 'copex'] },
  { term: 'agua sanitaria', variants: ['qboa', 'ypa', 'brilhante', 'suprema'] },
  { term: 'desinfetante', variants: ['lysoform', 'pinho sol', 'ypa', 'mr musculo'] },
  { term: 'detergente', variants: ['ype', 'limpol', 'minuano', 'omo'] },
  { term: 'sabao liquido', variants: ['omo', 'brilhante', 'ype', 'ariel'] },
  { term: 'papel higienico', variants: ['neve', 'mili', 'personal', 'fofinho'] },
  { term: 'papel toalha', variants: ['snob', 'kitchen', 'mili', 'scala'] },
  { term: 'cotonete', variants: ['johnsons', 'cremer', 'needs'] },
  { term: 'algodao', variants: ['cremer', 'needs', 'sussex'] },
  { term: 'mascara cirurgica', variants: ['needs', 'descarpack', 'medix', 'cremer'] },
  { term: 'luva descartavel', variants: ['descarpack', 'medix', 'nugard', 'cremer'] },
  { term: 'termometro', variants: ['g tech', 'incoterm', 'multilaser', 'omron', 'bioland'] },
  { term: 'aparelho de pressao', variants: ['g tech', 'omron', 'incoterm', 'bioland', 'premium'] },
  { term: 'nebulizador', variants: ['g tech', 'omron', 'medicate', 'dellamed'] },
  { term: 'inalador', variants: ['g tech', 'omron', 'medicate', 'dellamed'] },
  { term: 'oximetro', variants: ['g tech', 'bioland', 'multilaser', 'medlevensohn'] },
  { term: 'curativo', variants: ['band aid', 'cremer', 'needs', 'nexcare'] },
  { term: 'gaze esteril', variants: ['cremer', 'needs', 'americana', 'descarpack'] },
  { term: 'esparadrapo', variants: ['cremer', 'missner', 'nexcare', 'needs'] },
  { term: 'seringa', variants: ['descarpack', 'injex', 'bd', 'sr'] },
  { term: 'creme para maos', variants: ['nivea', 'granado', 'neutrogena', 'cerave'] },
  { term: 'creme para os pes', variants: ['granado', 'nivea', 'needs', 'footner'] },
  { term: 'pos sol', variants: ['nivea sun', 'sundown', 'cenoura bronze', 'needs'] },
  { term: 'removedor de esmalte', variants: ['farmax', 'ideal', 'beira alta', 'impala'] },
  { term: 'esmalte', variants: ['risque', 'colorama', 'impala', 'dailus'] },
  { term: 'agua micelar', variants: ['loreal', 'nivea', 'bioderma', 'garnier'] },
  { term: 'demaquilante', variants: ['loreal', 'nivea', 'quem disse berenice', 'tracta'] },
  { term: 'creme antiacne', variants: ['principia', 'needs', 'la roche', 'darrow'] },
  { term: 'gel de limpeza facial', variants: ['cerave', 'la roche', 'darrow', 'nivea'] },
  { term: 'sabonete de glicerina', variants: ['granado', 'phebo', 'johnsons baby', 'davene'] },
  { term: 'protetor labial', variants: ['nivea', 'bepantol', 'eucerin', 'carmed'] },
  { term: 'hidratante labial', variants: ['nivea', 'bepantol', 'carmed', 'eucerin'] }
];

const FOOD_AND_WELLNESS_GROUPS = [
  { term: 'cha', variants: ['camomila', 'boldo', 'erva doce', 'hortela'] },
  { term: 'mel', variants: ['silvestre', 'eucalipto', 'apis flora', 'baldoni'] },
  { term: 'propolis', variants: ['apis flora', 'baldoni', 'verde', 'extrato'] },
  { term: 'gengibre', variants: ['capsulas', 'cha', 'po', 'extrato'] },
  { term: 'cafeina', variants: ['capsulas', '200mg', '420mg', 'pre treino'] },
  { term: 'pre treino', variants: ['max titanium', 'integralmedica', 'dark lab', 'adaptogen'] },
  { term: 'albumina', variants: ['naturovos', 'saltos', 'integralmedica', 'baunilha'] },
  { term: 'biscoito', variants: ['club social', 'trakinas', 'passatempo', 'maizena', 'agua e sal', 'recheado'] },
  { term: 'salgadinho', variants: ['ruffles', 'doritos', 'fandangos', 'sensacoes', 'cheetos'] },
  { term: 'suco', variants: ['del valle', 'tial', 'maguary', 'uva', 'laranja'] },
  { term: 'cha gelado', variants: ['leao', 'mate', 'pessego', 'limao'] },
  { term: 'agua tonica', variants: ['schweppes', 'antarctica', 'zero', 'lata'] },
  { term: 'achocolatado', variants: ['nescau', 'toddy', 'chocolate em po', 'pronto para beber'] },
  { term: 'cereal matinal', variants: ['sucrilhos', 'nescau cereal', 'granola', 'matinal'] },
  { term: 'granola', variants: ['jasmine', 'muesli', 'tradicional', 'sem acucar'] },
  { term: 'pao de forma', variants: ['wickbold', 'pullman', 'integral', 'tradicional'] },
  { term: 'torrada', variants: ['bauducco', 'marilan', 'integral', 'tradicional'] },
  { term: 'geleia', variants: ['queensberry', 'linea', 'morango', 'frutas vermelhas'] },
  { term: 'amendoim', variants: ['japones', 'torrado', 'pacoca', 'mendorato'] },
  { term: 'castanha', variants: ['caju', 'do para', 'mix', 'sem sal'] },
  { term: 'barra proteica', variants: ['bold', 'integralmedica', 'max titanium', 'trio', 'nutry'] }
];

function buildGroupedQueries(groups) {
  return groups.flatMap(({ term, variants }) => (
    variants.map(variant => `${term} ${variant}`.trim())
  ));
}

function normalizeQuery(query) {
  return String(query || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function buildSampleQueries() {
  const queries = [
    ...CORE_SAMPLE_QUERIES,
    ...MEDICINE_TERMS.flatMap(term => MEDICINE_VARIANTS.map(variant => `${term} ${variant}`)),
    ...buildGroupedQueries(BRANDED_QUERY_GROUPS),
    ...buildGroupedQueries(SIZE_VARIANT_GROUPS),
    ...buildGroupedQueries(HOUSEHOLD_AND_DEVICE_GROUPS),
    ...buildGroupedQueries(FOOD_AND_WELLNESS_GROUPS)
  ];

  const uniqueQueries = [];
  const seen = new Set();

  for (const query of queries) {
    const normalized = normalizeQuery(query);

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    uniqueQueries.push(normalized);
  }

  if (uniqueQueries.length < TARGET_QUERY_COUNT) {
    throw new Error(`Lista insuficiente de buscas: ${uniqueQueries.length} de ${TARGET_QUERY_COUNT}`);
  }

  return uniqueQueries.slice(0, TARGET_QUERY_COUNT);
}

const SAMPLE_QUERIES = buildSampleQueries();

function numberFromEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOptionalInteger(value) {
  if (value == null || String(value).trim() === '') {
    return 1;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : 1;
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

function summarizeProduct(product) {
  if (!product) {
    return null;
  }

  return {
    id: product.id ?? null,
    codigo: product.codigo ?? null,
    codigo_barras: product.codigo_barras ?? null,
    descricao: product.descricao ?? null,
    descricao_alpha7: product.descricao_alpha7 ?? null,
    estoque_disponivel: product.estoque_disponivel ?? null,
    preco_venda: product.precos?.preco_venda ?? null
  };
}

function summarizeProducts(products) {
  return (Array.isArray(products) ? products : [])
    .map(summarizeProduct)
    .filter(Boolean);
}

function buildSerializableResult(query, result) {
  return {
    query,
    httpStatus: result.httpStatus,
    found: result.found,
    total: result.total,
    message: result.message,
    topProducts: summarizeProducts(result.topProducts)
  };
}

function buildConsoleRow(item) {
  return {
    query: item.query,
    status: item.httpStatus,
    found: item.found,
    total: item.total,
    top_product: item.topProducts?.[0]?.descricao ?? null,
    message: item.message
  };
}

function buildSummary(results) {
  const foundCount = results.filter(item => item.found === true).length;
  const notFoundCount = results.filter(item => item.httpStatus === 404).length;
  const failedCount = results.filter(item => item.error).length;

  return {
    total_queries: results.length,
    found_queries: foundCount,
    not_found_queries: notFoundCount,
    failed_queries: failedCount
  };
}

async function main() {
  const baseUrl = process.env.PRODUCT_SEARCH_API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const vetorToken = process.env.PRODUCT_SEARCH_VETOR_TOKEN;
  const cdfilial = parseOptionalInteger(process.env.PRODUCT_SEARCH_CDFILIAL);
  const timeout = process.env.PRODUCT_SEARCH_TIMEOUT_MS;
  const concurrency = numberFromEnv(process.env.PRODUCT_SEARCH_BATCH_CONCURRENCY, 3);
  const outputPath = path.resolve(
    process.cwd(),
    process.env.PRODUCT_SEARCH_BATCH_OUTPUT || 'artifacts/product-search-batch/results.json'
  );

  if (!vetorToken || !String(vetorToken).trim()) {
    throw new Error('PRODUCT_SEARCH_VETOR_TOKEN nao configurado');
  }

  const client = new ProductSearchClient({
    baseUrl,
    vetorToken,
    cdfilial,
    timeout
  });

  console.log(`[1/2] Executando ${SAMPLE_QUERIES.length} buscas em ${baseUrl}`);

  const startedAt = new Date().toISOString();
  const results = await runWithConcurrencyLimit(
    SAMPLE_QUERIES,
    concurrency,
    async (query, index) => {
      console.log(`[${index + 1}/${SAMPLE_QUERIES.length}] ${query}`);

      try {
        const result = await client.search(query);
        return buildSerializableResult(query, result);
      } catch (error) {
        return {
          query,
          httpStatus: null,
          found: false,
          total: 0,
          message: error.message,
          error: error.message,
          topProducts: []
        };
      }
    }
  );

  const finishedAt = new Date().toISOString();
  const summary = buildSummary(results);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    JSON.stringify(
      {
        startedAt,
        finishedAt,
        baseUrl,
        cdfilial,
        concurrency,
        summary,
        results
      },
      null,
      2
    ),
    'utf8'
  );

  console.log('[2/2] Resumo');
  console.table(results.map(buildConsoleRow));
  console.table(summary);
  console.log(`Arquivo gerado em: ${outputPath}`);
}

main().catch(error => {
  console.error('Falha ao executar buscas em lote:', error.message);
  process.exitCode = 1;
});
