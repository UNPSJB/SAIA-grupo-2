import type { CalibracionRealizada, CalibracionRealizadaPayload } from '../types/calibracionRealizada';
const BASE_URL = 'http://127.0.0.1:8000/calibraciones_realizadas';

export const getCalibracionesByEquipoId = async (id: string): Promise<CalibracionRealizada[]> =>{
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) throw new Error("Error al cargar las calibraciones");
    return res.json();
}

export const registrarCalibracion = async (datos: CalibracionRealizadaPayload): Promise<{ ok: boolean; mensaje?: string }> => {
    const res = await fetch(`${BASE_URL}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    if (!res.ok) {
        const errorData = await res.json();
        return { ok: false, mensaje: errorData.mensaje };
    }
    return { ok: true };
};