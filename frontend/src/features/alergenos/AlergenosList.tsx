import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { ResumenAlergenosProducto } from '../../types/alergenos';
import { getResumenAlergenos } from '../../services/alergenosServices';
import Boton from '../../components/Boton';
import BuscadorTexto from '../../components/BuscadorTexto';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';
import TarjetasFiltro, { type Metrica } from '../../components/TarjetasFiltro';
import { filtrarPorTexto } from '../../utils/texto';
import { ETIQUETA_ALERGENO } from './etiquetas';
import estilos from './Alergenos.module.css';
import styles from '../../styles/shared.module.css';

type Grupo = 'confirmada' | 'sugerida' | 'revisar' | 'sin_conservacion';

interface Respuesta {
    productos: ResumenAlergenosProducto[];
    error: boolean;
}

function situacionDe(resumen: ResumenAlergenosProducto): { texto: string; clase: string } {
    if (resumen.estado === 'confirmada' && resumen.propuesta_cambio) {
        return { texto: 'Confirmada · revisar cambios', clase: estilos.pastillaSugerida };
    }
    if (resumen.estado === 'confirmada') return { texto: 'Confirmada', clase: estilos.pastillaConfirmada };
    if (!resumen.guardada && !resumen.tiene_receta) return { texto: 'Sin receta ni declaración', clase: '' };
    return { texto: 'Sugerida por el sistema', clase: estilos.pastillaSugerida };
}

function enGrupo(resumen: ResumenAlergenosProducto, grupo: Grupo): boolean {
    if (grupo === 'confirmada') return resumen.estado === 'confirmada' && !resumen.propuesta_cambio;
    if (grupo === 'sugerida') return resumen.estado === 'sugerida';
    if (grupo === 'revisar') return resumen.estado === 'confirmada' && resumen.propuesta_cambio;
    return resumen.leyenda_conservacion === null;
}

export default function AlergenosList() {
    const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState<Grupo | ''>('');

    useEffect(() => {
        let cancelado = false;

        getResumenAlergenos()
            .then((productos) => {
                if (!cancelado) setRespuesta({ productos, error: false });
            })
            .catch((problema) => {
                console.error('Error al cargar los alérgenos:', problema);
                if (!cancelado) setRespuesta({ productos: [], error: true });
            });

        return () => {
            cancelado = true;
        };
    }, []);

    const productos = respuesta?.productos ?? [];
    const cuenta = (grupo: Grupo) => productos.filter((resumen) => enGrupo(resumen, grupo)).length;
    const visibles = filtrarPorTexto(
        filtro === '' ? productos : productos.filter((resumen) => enGrupo(resumen, filtro)),
        busqueda,
        (resumen) => [resumen.producto.nombre],
    );

    const metricas: Metrica[] = [
        { id: 'confirmada', titulo: 'CONFIRMADAS', valor: cuenta('confirmada'), color: '#22c55e' },
        { id: 'sugerida', titulo: 'POR CONFIRMAR', valor: cuenta('sugerida'), color: '#f59e0b' },
        { id: 'revisar', titulo: 'A REVISAR', valor: cuenta('revisar'), color: '#ef4444' },
        { id: 'sin_conservacion', titulo: 'SIN CONSERVACIÓN', valor: cuenta('sin_conservacion'), color: '#94a3b8' },
    ];

    const columnas: Columna<ResumenAlergenosProducto>[] = [
        {
            key: 'producto',
            encabezado: 'Producto',
            ordenable: true,
            variant: 'titulo',
            valorOrdenamiento: (resumen) => resumen.producto.nombre.toLowerCase(),
            render: (resumen) => resumen.producto.nombre,
        },
        {
            key: 'estado',
            encabezado: 'Declaración',
            ordenable: true,
            valorOrdenamiento: (resumen) => situacionDe(resumen).texto,
            render: (resumen) => {
                const situacion = situacionDe(resumen);
                return <span className={`${estilos.pastilla} ${situacion.clase}`}>{situacion.texto}</span>;
            },
        },
        {
            key: 'contiene',
            encabezado: 'Contiene',
            render: (resumen) =>
                resumen.contiene.length === 0 && !resumen.contiene_gluten ? (
                    <span className={styles.textMuted}>—</span>
                ) : (
                    <div className={estilos.chips}>
                        {resumen.contiene.map((alergeno) => (
                            <span key={alergeno} className={estilos.chip}>
                                {ETIQUETA_ALERGENO[alergeno]}
                            </span>
                        ))}
                        {resumen.contiene_gluten && <span className={`${estilos.chip} ${estilos.chipGluten}`}>Gluten</span>}
                    </div>
                ),
        },
        {
            key: 'puede_contener',
            encabezado: 'Puede contener',
            render: (resumen) =>
                resumen.puede_contener.length === 0 ? (
                    <span className={styles.textMuted}>—</span>
                ) : (
                    <div className={estilos.chips}>
                        {resumen.puede_contener.map((alergeno) => (
                            <span key={alergeno} className={estilos.chip}>
                                {ETIQUETA_ALERGENO[alergeno]}
                            </span>
                        ))}
                    </div>
                ),
        },
        {
            key: 'conservacion',
            encabezado: 'Conservación',
            render: (resumen) => resumen.leyenda_conservacion ?? <span className={styles.textMuted}>Sin cargar</span>,
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            variant: 'acciones',
            render: (resumen) => (
                <div className={styles.grupoBotonesTabla}>
                    <Link to={`/alergenos/${resumen.producto.id}`}>
                        <Boton variant="editar" title="Revisar alérgenos y conservación" />
                    </Link>
                </div>
            ),
        },
    ];

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Alérgenos y Conservación"
                descripcion="Declaración de alérgenos y gluten de cada producto, propuesta por el sistema a partir de la receta vigente y confirmada por una persona con permiso de administrar, y sus condiciones de conservación."
                acciones={
                    <Link to="/alergenos/insumos">
                        <Boton variant="editar">Marcas de insumos</Boton>
                    </Link>
                }
            />

            {respuesta?.error && <p className={estilos.mensajeError}>No se pudieron cargar los productos.</p>}

            {respuesta !== null && productos.length > 0 && (
                <TarjetasFiltro
                    metricas={metricas}
                    filtroActual={filtro}
                    onFiltroChange={(id) => setFiltro(id as Grupo | '')}
                />
            )}

            <div className={styles.filaBotonesSuperiores}>
                <BuscadorTexto valor={busqueda} onCambio={setBusqueda} placeholder="Buscar producto..." />
            </div>

            <TablaPaginada
                datos={visibles}
                columnas={columnas}
                gridTemplateColumns="1.3fr 1.4fr 1.6fr 1.2fr 2fr 0.8fr"
                itemsPorPagina={10}
                mensajeVacio={
                    respuesta === null
                        ? 'Cargando productos…'
                        : busqueda || filtro
                          ? 'No hay productos con los filtros aplicados.'
                          : 'Todavía no hay productos cargados.'
                }
                columnaOrdenInicial="producto"
                tituloExportacion="alergenos_y_conservacion"
            />
        </div>
    );
}
