import type { ConsumoPayload, ConsumoAcumulado } from '../types/consumos';

const BASE_URL = 'http://127.0.0.1:8000/consumos';

export const saveConsumo = async (datos: ConsumoPayload): Promise<boolean> => {
    try {
        const res = await fetch(`${BASE_URL}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos),
        });
        return res.ok;
    } catch (error) {
        console.error("Error registrando consumo:", error);
        return false;
    }
};

export const getConsumoAcumulado = async (): Promise<ConsumoAcumulado[]> => {
    try {
        const res = await fetch(`${BASE_URL}/acumulado`);
        if (!res.ok) throw new Error("Error al cargar el reporte");
        return res.json();
    } catch (error) {
        console.error("Error obteniendo reporte acumulado:", error);
        return [];
    }
};