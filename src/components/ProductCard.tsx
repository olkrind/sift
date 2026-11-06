import { scoreProduct } from '../score.ts'
import type { Nutrients, Product } from '../sources/types.ts'

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

export function ProductCard({ product }: { product: Product }) {
  const score = scoreProduct(product)
  const nutrients = product.nutrients
  const rows = NUTRIENT_ROWS.filter(({ key }) => nutrients?.[key] !== undefined)

  return (
    <article className="card">
      <header className="product-head">
        {product.imageUrl && <img src={product.imageUrl} alt="" />}
        <div>
          <h2>{product.name ?? 'Без названия'}</h2>
          <p className="muted">{[product.brand, product.quantity].filter(Boolean).join(' · ')}</p>
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
        <p className="notice">Для оценки не хватает данных: у продукта нет Nutri-Score.</p>
      )}

      {(product.nutriScore || product.nova) && (
        <div className="grades">
          {product.nutriScore && (
            <span className={`grade grade-${product.nutriScore}`}>Nutri-Score {product.nutriScore.toUpperCase()}</span>
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

      {product.url && (
        <a className="link" href={product.url} target="_blank" rel="noreferrer">
          Открыть в источнике
        </a>
      )}
    </article>
  )
}
