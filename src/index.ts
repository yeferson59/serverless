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

const ROUTES = ['/actividades', '/estadisticas'];

function responder(datos: any, estado = 200) {
	return Response.json(datos, { status: estado, headers: { 'Cache-Control': 'no-store' } });
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const ruta = url.pathname.replace(/\/+$/, '') || '/';
		const metodo = request.method;

		if (metodo === GET && ruta == '/') {
			return responder({ servicio: 'API Academica Serverless', universidad: 'Universidad de Pamplona', estado: 'activo' });
		}

		if (metodo === GET && (ruta === ROUTES[0] || ruta.startsWith(`${ROUTES[0]}/`))) {
			const query = url.searchParams.get('creditos');

			if (query) {
				return responder(actividades.filter((a) => a.creditos === Number(query)));
			}

			if (ruta.split('/').length < 3) {
				return responder(actividades);
			}

			const pathname = ruta.split('/')[2].trim();

			if (pathname === '') {
				return responder({ error: 'El id de la actividad es obligatorio' }, 400);
			}

			const id = Number(pathname);

			if (!id) {
				return responder({ error: 'El id de la actividad debe ser un número válido' }, 400);
			}

			const actividad = actividades.find((a) => a.id === id);

			if (!actividad) {
				return responder({ error: `No existe una actividad con id ${id}` }, 404);
			}

			return responder(actividad);
		}

		if (metodo === POST && ruta === ROUTES[0]) {
			let req: unknown;

			try {
				req = await request.json();
			} catch {
				return responder({ error: 'El cuerpo de la petición debe ser un JSON válido' }, 400);
			}

			if (typeof req !== 'object') {
				return responder({ error: 'El cuerpo de la petición debe ser un objeto' }, 400);
			}

			if (!req) {
				return responder({ error: 'El cuerpo de la petición no puede ser null' }, 400);
			}

			const data = req as {
				nombre: string | null;
				creditos: string | null;
			};

			const nombre = data.nombre?.trim();

			if (!nombre || typeof data.nombre !== 'string' || nombre === '' || nombre.length > 100) {
				return responder({ error: 'El nombre es obligatorio y debe tener máximo 100 caracteres' }, 400);
			}

			const creditos = Number(data.creditos);

			if (!creditos || typeof creditos !== 'number' || creditos <= 0) {
				return responder({ error: 'Los créditos deben ser un número mayor que 0' }, 400);
			}

			const asignatura = {
				id: actividades.length + 1,
				nombre: nombre.trim(),
				creditos: creditos,
			};

			actividades.push(asignatura);

			return responder(actividades);
		}

		if (metodo === GET && ruta === ROUTES[1]) {
			return responder({ total: actividades.length, totalCreditos: actividades.reduce((total, num) => total + num.creditos, 0) });
		}

		return responder({ error: 'Ruta no encontrada' }, 404);
	},
} satisfies ExportedHandler<Env>;
