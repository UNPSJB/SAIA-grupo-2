import { networkInterfaces } from 'node:os'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const BACKEND = 'http://127.0.0.1:8000'
const ADAPTADORES_VIRTUALES = /virtual|vmware|vbox|vethernet|wsl|docker|hyper-v|loopback|tailscale|zerotier/i

const REDES_INALAMBRICAS = /wi-?fi|wlan|wireless|inal[aá]mbrica/i
const REDES_DE_MAQUINAS_VIRTUALES = /^192\.168\.(56|99)\./

function prioridad(nombre: string, ip: string): number {
  const base = REDES_INALAMBRICAS.test(nombre) ? 0 : 4
  if (ip.startsWith('192.168.')) return base
  if (ip.startsWith('10.')) return base + 1
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return base + 2
  return base + 3
}

function direccionesDeRed(): string[] {
  const candidatas: { ip: string; orden: number }[] = []
  for (const [nombre, interfaces] of Object.entries(networkInterfaces())) {
    if (ADAPTADORES_VIRTUALES.test(nombre)) continue
    for (const datos of interfaces ?? []) {
      if (datos.family === 'IPv4' && !datos.internal && !datos.address.startsWith('169.254.')) {
        candidatas.push({ ip: datos.address, orden: prioridad(nombre, datos.address) })
      }
    }
  }
  const reales = candidatas.filter((candidata) => !REDES_DE_MAQUINAS_VIRTUALES.test(candidata.ip))
  const elegidas = reales.length > 0 ? reales : candidatas
  return elegidas.sort((a, b) => a.orden - b.orden).map((candidata) => candidata.ip)
}

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_DIRECCIONES_RED': JSON.stringify(direccionesDeRed().join(',')),
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: BACKEND,
        rewrite: (ruta) => ruta.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('proxyRes', (respuesta) => {
            const destino = respuesta.headers.location
            if (destino) {
              const { pathname, search } = new URL(destino, BACKEND)
              respuesta.headers.location = `/api${pathname}${search}`
            }
          })
        },
      },
    },
  },
})
