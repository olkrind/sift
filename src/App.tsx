import { useCallback, useState } from 'react'
import type { SubmitEvent } from 'react'
import { isValidBarcode, normalizeBarcode } from './barcode.ts'
import { Coverage } from './components/Coverage.tsx'
import { ProductCard } from './components/ProductCard.tsx'
import { Scanner } from './components/Scanner.tsx'
import { SourceList } from './components/SourceList.tsx'
import { useCoverage } from './coverage.ts'
import { lookup } from './sources/index.ts'
import type { LookupResult } from './sources/index.ts'

type Search =
  | { status: 'idle' }
  | { status: 'loading'; code: string }
  | { status: 'done'; code: string; result: LookupResult }

export function App() {
  const [scanning, setScanning] = useState(false)
  const [search, setSearch] = useState<Search>({ status: 'idle' })
  const [manualCode, setManualCode] = useState('')
  const [manualError, setManualError] = useState(false)
  const { entries, record, clear } = useCoverage()

  const find = useCallback(
    async (rawCode: string) => {
      const code = normalizeBarcode(rawCode)
      setScanning(false)
      setSearch({ status: 'loading', code })
      const result = await lookup(code)
      setSearch({ status: 'done', code, result })
      record(code, result)
    },
    [record],
  )

  function submitManual(event: SubmitEvent) {
    event.preventDefault()
    const code = manualCode.trim()
    if (!isValidBarcode(code)) {
      setManualError(true)
      return
    }
    setManualError(false)
    setManualCode('')
    void find(code)
  }

  const failed = search.status === 'done' && !search.result.product && search.result.unavailable

  return (
    <div className="app">
      <header className="app-header">
        <h1>Sift</h1>
      </header>

      <main>
        {scanning && <Scanner onCode={find} />}

        {!scanning && search.status === 'idle' && (
          <p className="intro">Отсканируйте штрихкод продукта или введите его номер.</p>
        )}

        {search.status === 'loading' && !scanning && (
          <p className="notice" role="status">
            Поиск {search.code}…
          </p>
        )}

        {search.status === 'done' && !scanning && (
          <>
            {search.result.product ? (
              <ProductCard code={search.code} product={search.result.product} />
            ) : (
              <article className="card">
                <h2>{failed ? 'Базы недоступны' : 'Продукт не найден'}</h2>
                <p className="muted">Код {search.code}</p>
                {failed ? (
                  <button type="button" className="button-quiet" onClick={() => void find(search.code)}>
                    Повторить
                  </button>
                ) : (
                  <a
                    className="link"
                    href={`https://world.openfoodfacts.org/product/${search.code}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Добавить в Open Food Facts
                  </a>
                )}
              </article>
            )}
            <SourceList results={search.result.results} />
          </>
        )}

        <form className="manual" onSubmit={submitManual}>
          <input
            inputMode="numeric"
            autoComplete="off"
            placeholder="Номер штрихкода"
            aria-label="Номер штрихкода"
            aria-invalid={manualError}
            value={manualCode}
            onChange={(event) => {
              setManualCode(event.target.value)
              setManualError(false)
            }}
          />
          <button type="submit" className="button-quiet">
            Найти
          </button>
        </form>
        {manualError && <p className="field-error">Неверный номер: проверьте цифры.</p>}

        <Coverage entries={entries} onClear={clear} />

        <footer className="credits">
          Данные:{' '}
          <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">
            Open Food Facts
          </a>{' '}
          (ODbL), USDA FoodData Central, Wikidata. Данные вносятся добровольно и могут содержать ошибки. Оценка Sift
          является черновой и не заменяет чтение этикетки.
        </footer>
      </main>

      <div className="action-bar">
        <button type="button" className="button-primary" onClick={() => setScanning((value) => !value)}>
          {scanning ? 'Отмена' : 'Сканировать'}
        </button>
      </div>
    </div>
  )
}
