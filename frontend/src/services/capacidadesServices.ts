import type { Capacidad } from '../types/capacidades';

const BASE_URL = 'http://127.0.0.1:8000/capacidades';

export const getCapacidades = async (): Promise<Capacidad[]> => {
    try {
        const res = await fetch(`${BASE_URL}/`); 
        if (!res.ok) throw new Error("Error al cargar capacidades");
        return res.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};

export const deleteCapacidad = async (id: number): Promise<boolean> => {
    try {
        const res = await fetch(`${BASE_URL}/${id}/`, { method: 'DELETE' });
        return res.ok;
    } catch (error) {
        console.error("Error de red al eliminar:", error);
        return false; 
    }
};

export const createCapacidad = async (nombre: string): Promise<boolean> => {
    try {
        const res = await fetch(`${BASE_URL}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre }),
        });
        return res.ok;
    } catch (error) {
        console.error("Error al crear:", error);
        return false;
    }
};