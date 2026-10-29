import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { env, exports } from 'cloudflare:workers';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const BASE = 'http://example.com';

type Actividad = { id: number; nombre: string; creditos: number };

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

/** Ejecuta el Worker directamente (estilo unitario). */
async function llamar(ruta: string, init?: RequestInit<IncomingRequestCfProperties>): Promise<Response> {
	const request = new IncomingRequest(`${BASE}${ruta}`, init);
	const ctx = createExecutionContext();
	const response = await worker.fetch(request, env, ctx);
	await waitOnExecutionContext(ctx);
	return response;
}

/** Envía un POST /actividades con un cuerpo JSON. */
function post(cuerpo: unknown): Promise<Response> {
	return llamar('/actividades', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(cuerpo),
	});
}

describe('RF-01 · GET /', () => {
	it('CP-01 responde HTTP 200 con el estado del servicio', async () => {
		const res = await llamar('/');

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			servicio: 'API Academica Serverless',
			universidad: 'Universidad de Pamplona',
			estado: 'activo',
		});
	});

	it('agrega la cabecera Cache-Control: no-store', async () => {
		const res = await llamar('/');

		expect(res.headers.get('Cache-Control')).toBe('no-store');
		expect(res.headers.get('Content-Type')).toContain('application/json');
	});
});

describe('RF-02 · GET /actividades', () => {
	it('CP-02 responde HTTP 200 con la lista de actividades', async () => {
		const res = await llamar('/actividades');
		const datos = (await res.json()) as Actividad[];

		expect(res.status).toBe(200);
		expect(Array.isArray(datos)).toBe(true);
		expect(datos.slice(0, 3)).toEqual([
			{ id: 1, nombre: 'Arquitectura de Software', creditos: 3 },
			{ id: 2, nombre: 'Computacion en la Nube', creditos: 3 },
			{ id: 3, nombre: 'Pruebas de Software', creditos: 2 },
		]);
	});
});

describe('RF-03 · GET /actividades/:id', () => {
	it('CP-03 responde HTTP 200 con la actividad 1', async () => {
		const res = await llamar('/actividades/1');

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ id: 1, nombre: 'Arquitectura de Software', creditos: 3 });
	});

	it('CP-04 responde HTTP 404 si la actividad no existe', async () => {
		const res = await llamar('/actividades/999');

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: 'No existe una actividad con id 999' });
	});

	it('responde HTTP 400 con un mensaje si el id no es numérico', async () => {
		const res = await llamar('/actividades/abc');

		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: 'El id de la actividad debe ser un número válido' });
	});
});

describe('RF-05 · rutas inexistentes', () => {
	it('CP-08 responde HTTP 404 en GET /inexistente', async () => {
		const res = await llamar('/inexistente');

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: 'Ruta no encontrada' });
	});

	it('responde HTTP 404 en GET /actividadesxyz (no es /actividades)', async () => {
		const res = await llamar('/actividadesxyz');

		expect(res.status).toBe(404);
	});

	it('responde HTTP 404 a un método no soportado (DELETE /actividades)', async () => {
		const res = await llamar('/actividades', { method: 'DELETE' });

		expect(res.status).toBe(404);
	});
});

describe('Reto 1 · GET /actividades?creditos=n', () => {
	it('CP-09 devuelve solo las actividades con ese número de créditos', async () => {
		const res = await llamar('/actividades?creditos=3');
		const datos = (await res.json()) as Actividad[];

		expect(res.status).toBe(200);
		expect(datos.length).toBeGreaterThan(0);
		expect(datos.every((a) => a.creditos === 3)).toBe(true);
	});

	it('devuelve una lista vacía si ninguna actividad coincide', async () => {
		const res = await llamar('/actividades?creditos=99');

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual([]);
	});
});

describe('Reto 2 · GET /estadisticas', () => {
	it('CP-10 devuelve el total de actividades y la suma de créditos', async () => {
		const lista = (await (await llamar('/actividades')).json()) as Actividad[];
		const res = await llamar('/estadisticas');

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			total: lista.length,
			totalCreditos: lista.reduce((suma, a) => suma + a.creditos, 0),
		});
	});
});

describe('RF-04 · POST /actividades', () => {
	it('CP-05 acepta una actividad válida y responde HTTP 200', async () => {
		const antes = (await (await llamar('/actividades')).json()) as Actividad[];
		const res = await post({ nombre: 'Arquitectura Serverless', creditos: 3 });
		const despues = (await res.json()) as Actividad[];

		expect(res.status).toBe(200);
		expect(despues).toHaveLength(antes.length + 1);
		expect(despues.at(-1)).toEqual({ id: antes.length + 1, nombre: 'Arquitectura Serverless', creditos: 3 });
	});

	it('elimina los espacios al inicio y al final del nombre', async () => {
		const res = await post({ nombre: '   Bases de Datos   ', creditos: 2 });
		const datos = (await res.json()) as Actividad[];

		expect(res.status).toBe(200);
		expect(datos.at(-1)?.nombre).toBe('Bases de Datos');
	});

	it('CP-06 responde HTTP 400 si falta el nombre', async () => {
		const res = await post({ creditos: 3 });

		expect(res.status).toBe(400);
		expect(await res.json()).toHaveProperty('error');
	});

	it('responde HTTP 400 si el nombre está vacío o solo tiene espacios', async () => {
		expect((await post({ nombre: '', creditos: 3 })).status).toBe(400);
		expect((await post({ nombre: '    ', creditos: 3 })).status).toBe(400);
	});

	it('CP-07 responde HTTP 400 si los créditos son negativos', async () => {
		const res = await post({ nombre: 'Actividad X', creditos: -2 });

		expect(res.status).toBe(400);
	});

	it('responde HTTP 400 si los créditos son cero, texto o faltan', async () => {
		expect((await post({ nombre: 'Actividad Y', creditos: 0 })).status).toBe(400);
		expect((await post({ nombre: 'Actividad Z', creditos: 'abc' })).status).toBe(400);
		expect((await post({ nombre: 'Actividad W' })).status).toBe(400);
	});

	it('CP-11 responde HTTP 400 si el nombre supera 100 caracteres (reto 3)', async () => {
		const res = await post({ nombre: 'a'.repeat(101), creditos: 2 });

		expect(res.status).toBe(400);
	});

	it('acepta un nombre de exactamente 100 caracteres (valor límite)', async () => {
		const res = await post({ nombre: 'b'.repeat(100), creditos: 2 });

		expect(res.status).toBe(200);
	});

	it('responde HTTP 400 si el cuerpo es null', async () => {
		const res = await post(null);

		expect(res.status).toBe(400);
	});

	it('responde HTTP 400 si el cuerpo no es un JSON válido', async () => {
		const res = await llamar('/actividades', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: '{ nombre: "sin comillas", ',
		});

		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: 'El cuerpo de la petición debe ser un JSON válido' });
	});

	it('no guarda las actividades rechazadas', async () => {
		const antes = (await (await llamar('/estadisticas')).json()) as { total: number };
		await post({ nombre: 'Rechazada', creditos: -5 });
		const despues = (await (await llamar('/estadisticas')).json()) as { total: number };

		expect(despues.total).toBe(antes.total);
	});
});

describe('Integración · Worker completo con SELF', () => {
	it('atiende GET /actividades a través del runtime de Workers', async () => {
		const res = await exports.default.fetch(`${BASE}/actividades`);

		expect(res.status).toBe(200);
		expect(Array.isArray(await res.json())).toBe(true);
	});

	it('atiende GET /inexistente con HTTP 404', async () => {
		const res = await exports.default.fetch(`${BASE}/inexistente`);

		expect(res.status).toBe(404);
	});
});
