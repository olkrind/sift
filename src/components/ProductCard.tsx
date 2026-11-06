import { detectProductType } from '../productType.ts'
import type { ProductType } from '../productType.ts'
import { scoreProduct } from '../score.ts'
import type { Nutrients, Product } from '../sources/types.ts'

const FORMULA_LABELS: Record<Exclude<ProductType, 'excluded'>, string> = {
  water: 'воды',
  juice: 'соков',
  beverage: 'напитков',
  cheese: 'сыров',
  fat: 'жиров, масел и орехов',
  food: 'обычных продуктов',
}

const NUTRIENT_ROWS: { key: keyof Nutrients; label: string; unit: string }[] = [
  { key: 'energyKcal', label: 'Энергия', unit: 'ккал' },
  { key: 'fat', label: 'Жиры', unit: 'г' },
  { key: 'saturatedFat', label: 'Насыщенные жиры', unit: 'г' },
  { key: 'carbohydrates', label: 'Углеводы', unit: 'г' },
  { key: 'sugars', label: 'Сахара', unit: 'г' },
  { key: 'fiber', label: 'Клетчатка', unit: 'г' },
  { key: 'protein', label: 'Белки', unit: 'г' },
  { key: 'salt', label: 'Соль', unit: 'г' },
]

const NOVA_LABELS: Record<number, string> = {
  1: 'Минимальная обработка',
  2: 'Кулинарный ингредиент',
  3: 'Обработанный продукт',
  4: 'Ультраобработанный продукт',
}

function formatNumber(value: number): string {
  return value.toLocaleString('ru', { maximumFractionDigits: 1 })
}

function noScoreMessage(product: Product): string {
  const { nutriScoreNotApplicable, nutriScoreMissing } = product
  if (nutriScoreNotApplicable || detectProductType(product) === 'excluded') {
    return 'Nutri-Score к этому продукту не применяется.'
  }
  if (nutriScoreMissing?.length) return `В базе нет Nutri-Score. Не хватает данных: ${nutriScoreMissing.join(', ')}.`
  return 'В базе нет Nutri-Score.'
}

type Props = {
  code: string
  product: Product
}

export function ProductCard({ code, product }: Props) {
  const score = scoreProduct(product)
  const nutrients = product.nutrients
  const rows = NUTRIENT_ROWS.filter(({ key }) => nutrients?.[key] !== undefined)
  const incomplete = !product.ingredients || (!product.nutriScore && !product.nutriScoreNotApplicable)

  return (
    <article className="card">
      <header className="product-head">
        {product.imageUrl && <img src={product.imageUrl} alt="" />}
        <div>
          <h2>{product.name ?? 'Без названия'}</h2>
          <p className="muted">{[product.brand, product.quantity].filter(Boolean).join(' · ')}</p>
          <p className="muted">Штрихкод {code}</p>
        </div>
      </header>

      {score ? (
        <section className={`score score-${score.tone}`}>
          <div className="score-value">{score.value}</div>
          <div>
            <strong>{score.verdict}</strong>
            <ul>
              {score.factors.map(({ label, points }) => (
                <li key={label}>
                  {label}: {points > 0 ? `+${points}` : points}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : (
        <p className="notice">{noScoreMessage(product)}</p>
      )}

      {score?.estimate && (
        <p className="notice">
          Приблизительный расчёт Sift по формуле для {FORMULA_LABELS[score.estimate.type]}: тип определён по названию и
          объёму. {noScoreMessage(product)}
        </p>
      )}

      {(product.nutriScore || score?.estimate || product.nova) && (
        <div className="grades">
          {product.nutriScore && (
            <span className={`grade grade-${product.nutriScore}`}>Nutri-Score {product.nutriScore.toUpperCase()}</span>
          )}
          {score?.estimate && (
            <span className={`grade grade-${score.estimate.grade}`}>
              Расчёт Sift: {score.estimate.grade.toUpperCase()}
            </span>
          )}
          {product.nova && (
            <span className="grade grade-nova">
              NOVA {product.nova}: {NOVA_LABELS[product.nova]}
            </span>
          )}
        </div>
      )}

      {product.allergens && product.allergens.length > 0 && (
        <section>
          <h3>Аллергены</h3>
          <p>{product.allergens.join(', ')}</p>
        </section>
      )}

      {product.additives && product.additives.length > 0 && (
        <section>
          <h3>Добавки</h3>
          <p>{product.additives.join(', ')}</p>
        </section>
      )}

      {rows.length > 0 && (
        <section>
          <h3>На 100 г</h3>
          <table>
            <tbody>
              {rows.map(({ key, label, unit }) => (
                <tr key={key}>
                  <th scope="row">{label}</th>
                  <td>
                    {formatNumber(nutrients![key]!)} {unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {product.ingredients && (
        <section>
          <h3>Состав</h3>
          <p>{product.ingredients}</p>
        </section>
      )}

      {incomplete ? (
        <a
          className="link"
          href={`https://world.openfoodfacts.org/product/${code}`}
          target="_blank"
          rel="noreferrer"
        >
          Дополнить карточку в Open Food Facts
        </a>
      ) : (
        product.url && (
          <a className="link" href={product.url} target="_blank" rel="noreferrer">
            Открыть в источнике
          </a>
        )
      )}
    </article>
  )
}
