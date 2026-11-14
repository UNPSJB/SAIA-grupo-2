import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { ResumenNutricionalInsumo } from '../../types/datosNutricionales';
import { getResumenNutricional } from '../../services/datosNutricionalesServices';
import Boton from '../../components/Boton';
import BuscadorTexto from '../../components/BuscadorTexto';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';
import TarjetasFiltro, { type Metrica } from '../../components/TarjetasFiltro';
import { filtrarPorTexto } from '../../utils/texto';
import { ETIQUETA_FUENTE, formatearFechaHora } from './nutrientes';
import estilos from './DatosNutricionales.module.css';
import styles from '../../styles/shared.module.css';

type Estado = 'completo' | 'incompleto' | 'sin_datos';

interface Respuesta {
    resumen: ResumenNutricionalInsumo[];
    error: boolean;
}

function estadoDe(item: ResumenNutricionalInsumo): Estado {
    if (item.cargados === 0) return 'sin_datos';
    return item.cargados === item.total ? 'completo' : 'incompleto';
}

export default function DatosNutricionalesList() {
    const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState<Estado | ''>('');

    useEffect(() => {
        let cancelado = false;

        getResumenNutricional()
            .then((resumen) => {
                if (!cancelado) setRespuesta({ resumen, error: false });
            })
            .catch((problema) => {
                console.error('Error al cargar los datos nutricionales:', problema);
                if (!cancelado) setRespuesta({ resumen: [], error: true });
            });

        return () => {
            cancelado = true;
        };
    }, []);

    const resumen = respuesta?.resumen ?? [];
    const cuenta = (estado: Estado) => resumen.filter((item) => estadoDe(item) === estado).length;
    const visibles = filtrarPorTexto(
        filtro === '' ? resumen : resumen.filter((item) => estadoDe(item) === filtro),
        busqueda,
        (item) => [item.insumo.nombre],
    );

    const metricas: Metrica[] = [
        { id: 'completo', titulo: 'COMPLETOS', valor: cuenta('completo'), color: '#22c55e' },
        { id: 'incompleto', titulo: 'INCOMPLETOS', valor: cuenta('incompleto'), color: '#f59e0b' },
        { id: 'sin_datos', titulo: 'SIN DATOS', valor: cuenta('sin_datos'), color: '#94a3b8' },
        { id: '', titulo: 'TOTAL INSUMOS', valor: resumen.length, color: '#3b82f6' },
    ];

    const columnas: Columna<ResumenNutricionalInsumo>[] = [
        {
            key: 'insumo',
            encabezado: 'Insumo',
            ordenable: true,
            variant: 'titulo',
            valorOrdenamiento: (item) => item.insumo.nombre.toLowerCase(),
            render: (item) => item.insumo.nombre,
        },
        {
            key: 'cargados',
            encabezado: 'Datos cargados',
            ordenable: true,
            render: (item) => (
                <div className={estilos.progreso}>
                    <span className={estilos.progresoTexto}>
                        {item.cargados} de {item.total}
                    </span>
                    <div className={estilos.barra} aria-hidden="true">
                        <div
                            className={`${estilos.barraRelleno} ${item.cargados === item.total ? estilos.barraCompleta : ''}`}
                            style={{ width: `${(item.cargados / item.total) * 100}%` }}
                        />
                    </div>
                </div>
            ),
        },
        {
            key: 'fuentes',
            encabezado: 'Fuentes',
            render: (item) =>
                item.fuentes.length === 0 ? (
                    <span className={estilos.sinDato}>—</span>
                ) : (
                    <div className={estilos.chips}>
                        {item.fuentes.map((fuente) => (
                            <span key={fuente} className={estilos.chip}>
                                {ETIQUETA_FUENTE[fuente]}
                            </span>
                        ))}
                        {item.modificados > 0 && (
                            <span className={estilos.marcaModificado}>
                                {item.modificados} {item.modificados === 1 ? 'modificado' : 'modificados'}
                            </span>
                        )}
                    </div>
                ),
        },
        {
            key: 'ultima_actualizacion',
            encabezado: 'Última actualización',
            ordenable: true,
            variant: 'fecha',
            valorOrdenamiento: (item) => item.ultima_actualizacion ?? '',
            render: (item) => (item.ultima_actualizacion ? formatearFechaHora(item.ultima_actualizacion) : '—'),
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            variant: 'acciones',
            render: (item) => (
                <div className={styles.grupoBotonesTabla}>
                    <Link to={`/datos-nutricionales/${item.insumo.id}`}>
                        <Boton variant="editar" title="Ver y cargar datos nutricionales" />
                    </Link>
                </div>
            ),
        },
    ];

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Datos Nutricionales de Insumos"
                descripcion="Valores cada 100 g (o 100 ml si el insumo es líquido), con la fuente de la que surge cada dato. Son la base para calcular la información nutricional de los productos."
            />

            {respuesta?.error && (
                <p style={{ color: 'var(--rojo-texto)' }}>No se pudieron cargar los datos nutricionales.</p>
            )}

            {respuesta !== null && resumen.length > 0 && (
                <TarjetasFiltro
                    metricas={metricas}
                    filtroActual={filtro}
                    onFiltroChange={(id) => setFiltro(id as Estado | '')}
                />
            )}

            <div className={styles.filaBotonesSuperiores}>
                <BuscadorTexto valor={busqueda} onCambio={setBusqueda} placeholder="Buscar insumo..." />
            </div>

            <TablaPaginada
                datos={visibles}
                columnas={columnas}
                gridTemplateColumns="1.6fr 1.1fr 2fr 1.3fr 0.8fr"
                itemsPorPagina={10}
                mensajeVacio={
                    respuesta === null
                        ? 'Cargando insumos…'
                        : busqueda || filtro
                          ? 'No hay insumos con los filtros aplicados.'
                          : 'Todavía no hay insumos activos.'
                }
                columnaOrdenInicial="insumo"
            />
        </div>
    );
}
