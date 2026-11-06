import { useEffect, useRef, useState } from 'react'
import { isValidBarcode } from '../barcode.ts'

const SCAN_INTERVAL_MS = 120

async function createDetector() {
  const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ])
  // По умолчанию файл загружается с jsDelivr; локальная копия совпадает по версии с библиотекой
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
    },
  })
  return new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a'] })
}

function cameraError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError') return 'Нет доступа к камере. Разрешите его в настройках браузера или введите код вручную.'
  if (name === 'NotFoundError') return 'Камера не найдена. Введите код вручную.'
  return 'Не удалось запустить камеру. Введите код вручную.'
}

type Props = {
  onCode: (code: string) => void
}

export function Scanner({ onCode }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let stopped = false
    let stream: MediaStream | undefined
    let timer: ReturnType<typeof setTimeout>

    async function start() {
      const camera = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      stream = camera
      if (stopped) return
      const video = videoRef.current!
      video.srcObject = camera
      await video.play()

      const detector = await createDetector()
      const tick = async () => {
        if (stopped) return
        const codes = video.readyState >= video.HAVE_CURRENT_DATA ? await detector.detect(video) : []
        const code = codes.map((item) => item.rawValue).find(isValidBarcode)
        if (stopped) return
        if (code) {
          navigator.vibrate?.(40)
          onCode(code)
        } else {
          timer = setTimeout(tick, SCAN_INTERVAL_MS)
        }
      }
      void tick()
    }

    start().catch((reason: unknown) => {
      if (!stopped) setError(cameraError(reason))
    })

    return () => {
      stopped = true
      clearTimeout(timer)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [onCode])

  if (error) return <p className="notice notice-error">{error}</p>

  return (
    <div className="scanner">
      {/* playsInline обязателен: без него iOS открывает видео на весь экран */}
      <video ref={videoRef} playsInline muted aria-label="Изображение с камеры" />
      <div className="scanner-frame" aria-hidden="true" />
      <p className="scanner-hint">Наведите камеру на штрихкод</p>
    </div>
  )
}
