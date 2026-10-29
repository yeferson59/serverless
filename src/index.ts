/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const actividades = [
	{ id: 1, nombre: 'Arquitectura de Software', creditos: 3 },
	{ id: 2, nombre: 'Computacion en la Nube', creditos: 3 },
	{ id: 3, nombre: 'Pruebas de Software', creditos: 2 },
];

const GET = 'GET';
const POST = 'POST';

function responder(datos: any, estado = 200) {
	return Response.json(datos, { status: estado, headers: { 'Cache-Control': 'no-store' } });
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const ruta = url.pathname.replace(/\/+$/, '') || '/';
		const metodo = request.method;

		if (metodo === GET && ruta === '/actividades') {
			const query = url.searchParams.get('creditos');

			if (query) {
				return responder(actividades.filter((a) => a.creditos === Number(query)));
			}

			return responder(actividades);
		}

		if (metodo === POST && ruta === '/actividades') {
			const data = (await request.json()) as {
				nombre: string | null;
				creditos: string | null;
			};

			if (typeof data.nombre !== 'string') {
				return responder({}, 400);
			}

			if (data.nombre.length > 100) {
				return responder({}, 400);
			}

			const creditos = Number(data.creditos);

			if (typeof creditos !== 'number') {
				return responder({}, 400);
			}

			const asignatura = {
				id: actividades.length + 1,
				nombre: data.nombre,
				creditos: creditos,
			};

			actividades.push(asignatura);

			return responder(actividades);
		}

		if (metodo === GET && ruta === '/estadisticas') {
			return responder({ total: actividades.length, totalCreditos: actividades.reduce((total, num) => total + num.creditos, 0) });
		}

		return responder({ servicio: 'API Academica Serverless', universidad: 'Universidad de Pamplona', estado: 'activo' });
	},
} satisfies ExportedHandler<Env>;
