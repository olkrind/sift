import type { Product } from './sources/types.ts'

export type ProductType = 'excluded' | 'water' | 'juice' | 'beverage' | 'cheese' | 'fat' | 'food'

// Тип определяется по названию: формула нужна карточкам без категории, а при наличии категории оценку считает база.
// Слова на сербском, английском, немецком и русском.
const ALCOHOL = ['pivo', 'piva', 'vino', 'vina', 'vranac', 'rakija', 'vodka', 'viski', 'liker', 'cider', 'sangria', 'chardonnay', 'merlot', 'sauvignon', 'lager', 'ipa', 'tuborg', 'heineken', 'carlsberg', 'beer', 'wine', 'whisky', 'whiskey', 'bier', 'wein', 'пиво', 'вино', 'водка']
// Nutri-Score не применяется: ложная буква хуже её отсутствия
const NOT_RATED = ['žvaka', 'žvake', 'gum', 'orbit', 'začin', 'začini', 'vegeta', 'spice', 'spices', 'curry', 'kari', 'biber', 'stevia', 'sladilo', 'zaslađivač', 'kvasac', 'morska so', 'kuhinjska so', 'ideja za', 'mešavina začina', 'gewürz', 'приправа', 'специи']
// Сухой продукт: на 100 г он не сравним с готовым напитком
const DRY_DRINKS = ['kafa', 'coffee', 'čaj', 'tea', 'kakao', 'cappuccino', 'frappe', 'nescafe', 'napitak', 'instant', 'кофе', 'чай', 'какао']
const CREAM_CHEESES = ['krem sir', 'cream cheese', 'topljeni sir']
// Ингредиент или вкус в названии, а не сам продукт: молочный шоколад, снек со вкусом сыра, рыба в масле
const NOT_THE_PRODUCT = ['čokolada', 'cokolada', 'chocolate', 'schokolade', 'шоколад', 'prah', 'powder', 'pulver', 'keks', 'keksi', 'kreker', 'krekeri', 'cracker', 'crackers', 'cookie', 'cookies', 'biscuit', 'biscuits', 'snack', 'snacks', 'čips', 'chips', 'ukus', 'flavor', 'flavored', 'flavour', 'flavoured', 'ulju', 'sardine', 'tuna', 'tunjevina', 'krem', 'cream', 'pasta']
const FATS = ['ulje', 'oil', 'öl', 'maslac', 'butter', 'margarin', 'margarine', 'orah', 'orasi', 'lešnik', 'lešnici', 'badem', 'bademi', 'kikiriki', 'pistaći', 'semenke', 'nuts', 'walnuts', 'almonds', 'peanuts', 'seeds', 'масло', 'орехи', 'миндаль', 'арахис', 'семечки']
const CHEESES = ['sir', 'sira', 'sirevi', 'kajmak', 'kačkavalj', 'feta', 'mocarela', 'mozzarella', 'gauda', 'gouda', 'trapist', 'parmezan', 'parmigiano', 'cheddar', 'edamer', 'ementaler', 'emmental', 'cheese', 'käse', 'сыр', 'брынза']
const WATERS = ['voda', 'water', 'wasser', 'aqua', 'eau', 'вода']
const JUICES = ['sok', 'sokovi', 'juice', 'saft', 'сок']
const BEVERAGES = ['kefir', 'ayran', 'nektar', 'kola', 'cola', 'pepsi', 'fanta', 'sprite', 'schweppes','limunada', 'čaj', 'kafa', 'mleko', 'napitak', 'nectar', 'lemonade', 'tea', 'coffee', 'milk', 'drink', 'smoothie', 'getränk', 'кефир', 'нектар', 'лимонад', 'чай', 'кофе', 'молоко', 'напиток']

const LIQUID_QUANTITY = /\d\s*(ml|cl|dl|l|ltr|liter|litre|мл|л)(?!\p{L})/iu

// Майонез, соусы и мороженое тоже продаются в мл, у готовых напитков калорийность ниже
const MAX_DRINK_KCAL = 120
// Масла и большинство сливочных масел и маргаринов: определяются и без слова в названии
const PURE_FAT_GRAMS = 80

// Без диакритики: на этикетках и в базе встречаются Kefír, Kéfir, cokolada
function plain(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function hasWord(name: string, words: string[]): boolean {
  return new RegExp(`(?<!\\p{L})(${words.map(plain).join('|')})(?!\\p{L})`, 'u').test(plain(name))
}

export function detectProductType({ name = '', quantity = '', nutrients }: Product): ProductType {
  const energyKcal = nutrients?.energyKcal
  const tooRichForDrink = energyKcal !== undefined && energyKcal > MAX_DRINK_KCAL

  if (hasWord(name, [...ALCOHOL, ...NOT_RATED])) return 'excluded'
  if (tooRichForDrink && hasWord(name, DRY_DRINKS)) return 'excluded'
  if ((nutrients?.fat ?? 0) >= PURE_FAT_GRAMS) return 'fat'
  if (hasWord(name, CREAM_CHEESES)) return 'cheese'

  const isIngredient = hasWord(name, NOT_THE_PRODUCT)
  if (!isIngredient && hasWord(name, FATS)) return 'fat'
  if (!isIngredient && hasWord(name, CHEESES)) return 'cheese'
  // Без калорийности вода не отличается от сладкого напитка с таким же словом в названии
  if (!isIngredient && hasWord(name, WATERS) && energyKcal === 0 && !nutrients?.sugars) return 'water'
  if (tooRichForDrink) return 'food'
  if (!isIngredient && hasWord(name, JUICES)) return 'juice'
  if (!isIngredient && hasWord(name, [...WATERS, ...BEVERAGES])) return 'beverage'
  return LIQUID_QUANTITY.test(quantity) ? 'beverage' : 'food'
}
