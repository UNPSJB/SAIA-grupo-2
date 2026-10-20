import { useState, useMemo } from 'react';
import Boton from './Boton';
import sharedStyles from '../styles/shared.module.css';
import localStyles from './TablaPaginada.module.css'; 

// Interfaz para definir cómo será cada columna
export interface Columna<T> {
    key: string;            // Identificador único (suele ser el nombre de la propiedad)
    encabezado: string;     // Lo que dice en el título de la tabla
    ordenable?: boolean;    // ¿Se puede hacer clic para ordenar?
    // Función opcional para celdas personalizadas (botones, fechas, badges)
    render?: (item: T) => React.ReactNode; 
    // Función opcional para extraer el valor real a ordenar (útil en objetos anidados)
    valorOrdenamiento?: (item: T) => any; 
    variant?: string | ((item: T) => string);
}

interface TablaPaginadaProps<T> {
    datos: T[];
    columnas: Columna<T>[];
    gridTemplateColumns: string; 
    itemsPorPagina?: number;
    mensajeVacio?: string;
    columnaOrdenInicial?: string;
    ordenAscInicial?: boolean;
}

export default function TablaPaginada<T>({
    datos,
    columnas,
    gridTemplateColumns,
    itemsPorPagina = 10,
    mensajeVacio = "No hay registros para mostrar.",
    columnaOrdenInicial = '',
    ordenAscInicial = true
}: TablaPaginadaProps<T>) {
    
    // Estados internos
    const [paginaActual, setPaginaActual] = useState(1);
    const [columnaOrden, setColumnaOrden] = useState<string>(columnaOrdenInicial);
    const [ordenAsc, setOrdenAsc] = useState<boolean>(ordenAscInicial);
    
    // 1. Manejo del Ordenamiento
    const handleSort = (columnaKey: string) => {
        if (columnaOrden === columnaKey) {
            setOrdenAsc(!ordenAsc);
        } else {
            setColumnaOrden(columnaKey);
            setOrdenAsc(true);
        }
    };

    // 2. Procesar Datos (Ordenar)
    const datosOrdenados = useMemo(() => {
        if (!columnaOrden) return datos;

        const columna = columnas.find(c => c.key === columnaOrden);
        if (!columna) return datos;

        return [...datos].sort((a, b) => {
            const valA = columna.valorOrdenamiento ? columna.valorOrdenamiento(a) : (a as any)[columnaOrden];
            const valB = columna.valorOrdenamiento ? columna.valorOrdenamiento(b) : (b as any)[columnaOrden];

            if (valA < valB) return ordenAsc ? -1 : 1;
            if (valA > valB) return ordenAsc ? 1 : -1;
            return 0;
        });
    }, [datos, columnaOrden, ordenAsc, columnas]);

    // 3. Procesar Datos (Paginar)
    const totalPaginas = Math.ceil(datosOrdenados.length / itemsPorPagina) || 1;
    const indiceUltimo = paginaActual * itemsPorPagina;
    const indicePrimer = indiceUltimo - itemsPorPagina;
    
    // Si la data cambia y nos quedamos en una página vacía, volvemos a la 1
    const itemsPaginados = datosOrdenados.slice(indicePrimer, indiceUltimo);
    if (itemsPaginados.length === 0 && paginaActual > 1) {
        setPaginaActual(1);
    }

    return (
        <>
            <div className={sharedStyles.contenedorTabla}>
                {/* Cabecera */}
                <div className={sharedStyles.filaHeader} style={{ gridTemplateColumns }}>
                    {columnas.map((col) => (
                        <div 
                            key={col.key} 
                            onClick={() => col.ordenable && handleSort(col.key)}
                            style={{ cursor: col.ordenable ? 'pointer' : 'default', userSelect: 'none' }}
                        >
                            {col.encabezado} {col.ordenable && columnaOrden === col.key ? (ordenAsc ? '↑' : '↓') : ''}
                        </div>
                    ))}
                </div>

                {/* Filas */}
                {itemsPaginados.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {mensajeVacio}
                    </div>
                ) : (
                    itemsPaginados.map((item, index) => (
                        <div key={index} className={sharedStyles.filaItem} style={{ gridTemplateColumns }}>
                            {columnas.map((col) => {
                                // Evaluamos si la variante es una función (y le pasamos el item) o un string fijo
                                const nombreVariante = typeof col.variant === 'function' ? col.variant(item) : col.variant;
                                
                                return (
                                    <div key={col.key} className={nombreVariante ? localStyles[nombreVariante] : ''}>
                                        {col.render ? col.render(item) : String((item as any)[col.key] || '')}
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}
            </div>

            {/* Controles de Paginación */}
            {totalPaginas > 1 && (
                <div className={sharedStyles.filaBotones} style={{ alignItems: 'center', marginTop: '25px', justifyContent: 'center' }}>
                    <Boton variant="volver" onClick={() => setPaginaActual(p => p - 1)} disabled={paginaActual === 1}>
                        Anterior
                    </Boton>
                    <span style={{ color: 'var(--text-h)', fontWeight: 'bold', margin: '0 15px' }}>
                        Página {paginaActual} de {totalPaginas}
                    </span>
                    <Boton variant="siguiente" onClick={() => setPaginaActual(p => p + 1)} disabled={paginaActual === totalPaginas}>
                        Siguiente
                    </Boton>
                </div>
            )}
        </>
    );
}