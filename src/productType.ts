import type { Product } from './sources/types.ts'

export type ProductType = 'alcohol' | 'water' | 'juice' | 'beverage' | 'cheese' | 'fat' | 'food'

// Тип определяется по названию: формула нужна карточкам без категории, а при наличии категории оценку считает база.
// Слова на сербском, английском, немецком и русском.
const ALCOHOL = ['pivo', 'piva', 'vino', 'vina', 'vranac', 'rakija','vodka', 'viski', 'liker', 'beer', 'wine', 'whisky', 'whiskey', 'bier', 'wein', 'пиво', 'вино', 'водка']
// Ингредиент или вкус в названии, а не сам продукт: молочный шоколад, снек со вкусом сыра, рыба в масле
const NOT_THE_PRODUCT = ['čokolada', 'cokolada', 'chocolate', 'schokolade', 'шоколад', 'prah', 'powder', 'pulver', 'keks', 'keksi', 'kreker', 'krekeri', 'cracker', 'crackers', 'cookie', 'cookies', 'biscuit', 'biscuits', 'snack', 'snacks', 'čips', 'chips', 'ukus', 'flavor', 'flavored', 'flavour', 'flavoured', 'ulju', 'sardine', 'tuna', 'tunjevina', 'krem', 'cream', 'pasta']
const FATS = ['ulje', 'oil', 'öl', 'maslac', 'butter', 'margarin', 'margarine', 'orah', 'orasi', 'lešnik', 'lešnici', 'badem', 'bademi', 'kikiriki', 'pistaći', 'semenke', 'nuts', 'walnuts', 'almonds', 'peanuts', 'seeds', 'масло', 'орехи', 'миндаль', 'арахис', 'семечки']
const CHEESES = ['sir', 'sira', 'sirevi', 'kajmak', 'kačkavalj','feta', 'mocarela', 'mozzarella', 'gauda', 'gouda', 'trapist', 'parmezan', 'parmigiano', 'cheddar', 'edamer', 'ementaler', 'emmental', 'cheese', 'käse', 'сыр', 'брынза']
const WATERS = ['voda', 'water', 'wasser', 'вода']
const JUICES = ['sok', 'sokovi', 'juice', 'saft', 'сок']
const BEVERAGES = ['kefir', 'ayran', 'nektar', 'kola', 'cola', 'limunada', 'čaj', 'kafa', 'mleko', 'napitak', 'nectar', 'lemonade', 'tea', 'coffee', 'milk', 'drink', 'smoothie', 'getränk', 'кефир', 'нектар', 'лимонад', 'чай', 'кофе', 'молоко', 'напиток']

const LIQUID_QUANTITY = /\d\s*(ml|cl|dl|l)\b/i

// Без диакритики: на этикетках и в базе встречаются Kefír, Kéfir, cokolada
function plain(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function hasWord(name: string, words: string[]): boolean {
  return new RegExp(`(?<!\\p{L})(${words.map(plain).join('|')})(?!\\p{L})`, 'u').test(plain(name))
}

export function detectProductType({ name = '', quantity = '', nutrients }: Product): ProductType {
  if (hasWord(name, ALCOHOL)) return 'alcohol'
  if (hasWord(name, NOT_THE_PRODUCT)) return 'food'
  if (hasWord(name, FATS)) return 'fat'
  if (hasWord(name, CHEESES)) return 'cheese'
  // Вода с калориями — ароматизированный или сладкий напиток
  if (hasWord(name, WATERS) && !nutrients?.energyKcal && !nutrients?.sugars) return 'water'
  if (hasWord(name, JUICES)) return 'juice'
  if (hasWord(name, [...WATERS, ...BEVERAGES]) || LIQUID_QUANTITY.test(quantity)) return 'beverage'
  return 'food'
}
