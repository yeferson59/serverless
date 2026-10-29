# API Académica Serverless

API REST para consultar y registrar actividades académicas, construida con **Cloudflare Workers** (plan gratuito) para el taller práctico de _Serverless Computing_ de Ingeniería del Software III, Universidad de Pamplona.

**URL pública:** https://taller-serverless.yefersontoloza59.workers.dev

## Endpoints

| Método | Ruta                      | Descripción                             | Respuestas |
| ------ | ------------------------- | --------------------------------------- | ---------- |
| GET    | `/`                       | Estado del servicio                     | 200        |
| GET    | `/actividades`            | Lista de actividades                    | 200        |
| GET    | `/actividades?creditos=3` | Actividades filtradas por créditos      | 200        |
| GET    | `/actividades/:id`        | Una actividad por ID                    | 200, 404   |
| POST   | `/actividades`            | Valida y recibe una actividad           | 200, 400   |
| GET    | `/estadisticas`           | Total de actividades y suma de créditos | 200        |
| *      | Cualquier otra ruta       | Recurso no encontrado                   | 404        |

Reglas del `POST /actividades` (cuerpo JSON `{ "nombre": "...", "creditos": 3 }`):

- `nombre` es obligatorio, no puede estar vacío y tiene máximo 100 caracteres.
- `creditos` debe ser un número mayor que cero.

> Las actividades viven en memoria: los registros creados con POST no son persistentes y se pierden al reiniciarse el Worker.

## Requisitos

- Node.js 18 o superior
- pnpm (`npm install -g pnpm`)
- Cuenta gratuita de Cloudflare (solo para desplegar; plan **Workers Free**)

## Instalación

```bash
git clone https://github.com/yeferson59/serverless.git
cd serverless
pnpm install
```

## Ejecución local

```bash
pnpm run dev
```

El servicio queda disponible en http://localhost:8787. Ejemplos:

```bash
curl http://localhost:8787/actividades
curl http://localhost:8787/actividades/1
curl -X POST http://localhost:8787/actividades \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Arquitectura Serverless","creditos":3}'
```

En PowerShell:

```powershell
$body = @{ nombre = "Arquitectura Serverless"; creditos = 3 } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8787/actividades" -Method Post -ContentType "application/json" -Body $body
```

## Despliegue

```bash
pnpm run login    # autentica Wrangler con Cloudflare (solo la primera vez)
pnpm run deploy   # publica el Worker
```

Wrangler muestra la URL pública al terminar, con la forma `https://taller-serverless.<subdominio>.workers.dev`.

## Estructura

```
src/index.ts       Lógica de la API (función fetch del Worker)
wrangler.jsonc     Configuración del Worker
package.json       Scripts: dev, deploy, login, test
```
