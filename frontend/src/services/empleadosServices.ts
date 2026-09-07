import type { Empleado, EmpleadoPayload } from '../types/empleados';

const BASE_URL = 'http://127.0.0.1:8000/empleados';

export const getEmpleados = async (): Promise<Empleado[]> => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error("Error al cargar empleados");
    return res.json();
};

export const getEmpleadoById = async (id: string): Promise<Empleado> => {
    const res = await fetch(`${BASE_URL}/${id}/`);
    if (!res.ok) throw new Error("Error al cargar el empleado");
    return res.json();
};

export const deleteEmpleado = async (id: string): Promise<boolean> => {
    const res = await fetch(`${BASE_URL}/${id}/`, { method: 'DELETE' });
    return res.ok;
};

export const saveEmpleado = async (datos: EmpleadoPayload, id?: string): Promise<boolean> => {
    const url = id ? `${BASE_URL}/${id}` : `${BASE_URL}/`;
    const metodo = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    return res.ok;
};
