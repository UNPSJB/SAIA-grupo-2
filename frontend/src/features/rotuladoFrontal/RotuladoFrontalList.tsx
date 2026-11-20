import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { EstadoRotuladoProducto } from '../../types/rotuladoFrontal';
import { getModuloRotuladoFrontal } from '../../services/parametrosNormativosServices';
import { getResumenRotulado } from '../../services/rotuladoFrontalServices';
import Boton from '../../components/Boton';
import BuscadorTexto from '../../components/BuscadorTexto';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';
import TarjetasFiltro, { type Metrica } from '../../components/TarjetasFiltro';
import { filtrarPorTexto } from '../../utils/texto';
import { formatearFechaHora } from '../datosNutricionales/nutrientes';
import { ETIQUETA_TIPO_PRODUCTO } from '../productos/formatoProducto';
import { ETIQUETA_SELLO_CORTA, RESULTADO } from '../parametrosNormativos/etiquetas';
import ModuloDesactivado from './ModuloDesactivado';
import estilos from './RotuladoFrontal.module.css';
import styles from '../../styles/shared.module.css';

type Grupo = 'corresponde' | 'exceptuado' | 'no_envasado' | 'sin_evaluar';

interface Respuesta {
    activo: boolean;
    estados: EstadoRotuladoProducto[];
    error: boolean;
}

function grupoDe(estado: EstadoRotuladoProducto): Grupo {
    const resultado = estado.evaluacion?.resultado;
    if (!resultado) return 'sin_evaluar';
    if (resultado === 'sin_agregados') return 'exceptuado';
    return resultado;
}

export default function RotuladoFrontalList() {
    const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState<Grupo | ''>('');

    useEffect(() => {
        let cancelado = false;

        getModuloRotuladoFrontal()
            .then(async (modulo) => {
                const estados = modulo.activo ? await getResumenRotulado() : [];
                if (!cancelado) setRespuesta({ activo: modulo.activo, estados, error: false });
            })
            .catch((problema) => {
                console.error('Error al cargar el rotulado frontal:', problema);
                if (!cancelado) setRespuesta({ activo: true, estados: [], error: true });
            });

        return () => {
            cancelado = true;
        };
    }, []);

    const estados = respuesta?.estados ?? [];
    const cuenta = (grupo: Grupo) => estados.filter((estado) => grupoDe(estado) === grupo).length;
    const visibles = filtrarPorTexto(
        filtro === '' ? estados : estados.filter((estado) => grupoDe(estado) === filtro),
        busqueda,
        (estado) => [estado.producto.nombre],
    );

    const metricas: Metrica[] = [
        { id: 'corresponde', titulo: 'CORRESPONDE', valor: cuenta('corresponde'), color: '#f59e0b' },
        { id: 'exceptuado', titulo: 'EXCEPTUADOS', valor: cuenta('exceptuado'), color: '#22c55e' },
        { id: 'no_envasado', titulo: 'NO APLICA', valor: cuenta('no_envasado'), color: '#94a3b8' },
        { id: 'sin_evaluar', titulo: 'SIN EVALUAR', valor: cuenta('sin_evaluar'), color: '#3b82f6' },
    ];

    const columnas: Columna<EstadoRotuladoProducto>[] = [
        {
            key: 'producto',
            encabezado: 'Producto',
            ordenable: true,
            variant: 'titulo',
            valorOrdenamiento: (estado) => estado.producto.nombre.toLowerCase(),
            render: (estado) => estado.producto.nombre,
        },
        {
            key: 'tipo',
            encabezado: 'Tipo',
            ordenable: true,
            valorOrdenamiento: (estado) => estado.producto.tipo,
            render: (estado) => ETIQUETA_TIPO_PRODUCTO[estado.producto.tipo],
        },
        {
            key: 'resultado',
            encabezado: 'Rotulado frontal',
            ordenable: true,
            valorOrdenamiento: (estado) => grupoDe(estado),
            render: (estado) => {
                if (!estado.evaluacion) return <span className={estilos.pastilla}>Sin evaluar</span>;
                const descripcion = RESULTADO[estado.evaluacion.resultado];
                return (
                    <span className={`${estilos.pastilla} ${estilos[`pastilla_${descripcion.tono}`] ?? ''}`}>
                        {descripcion.titulo}
                    </span>
                );
            },
        },
        {
            key: 'sellos',
            encabezado: 'Sellos y leyendas a evaluar',
            render: (estado) => {
                const evaluacion = estado.evaluacion;
                const sellos = evaluacion ? [...evaluacion.sellos_a_evaluar, ...evaluacion.leyendas] : [];
                if (sellos.length === 0) return <span className={styles.textMuted}>—</span>;
                return (
                    <div className={estilos.chips}>
                        {sellos.map((sello) => (
                            <span key={sello.sello} className={estilos.chip}>
                                {ETIQUETA_SELLO_CORTA[sello.sello]}
                            </span>
                        ))}
                    </div>
                );
            },
        },
        {
            key: 'fecha',
            encabezado: 'Última evaluación',
            ordenable: true,
            variant: 'fecha',
            valorOrdenamiento: (estado) => estado.evaluacion?.fecha ?? '',
            render: (estado) =>
                estado.evaluacion
                    ? `${formatearFechaHora(estado.evaluacion.fecha)} · v${estado.evaluacion.parametros.version}`
                    : '—',
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            variant: 'acciones',
            render: (estado) => (
                <div className={styles.grupoBotonesTabla}>
                    <Link to={`/rotulado-frontal/${estado.producto.id}`}>
                        <Boton
                            variant={estado.evaluacion ? 'editar' : 'crear'}
                            title={estado.evaluacion ? 'Revisar o corregir la evaluación' : 'Evaluar el producto'}
                        />
                    </Link>
                </div>
            ),
        },
    ];

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Rotulado Frontal"
                descripcion="Indica, para cada producto, si le corresponde el sistema de advertencias (octógonos) y qué sellos o leyendas hay que evaluar, según los parámetros normativos vigentes."
                acciones={
                    respuesta?.activo && (
                        <Link to="/rotulado-frontal/insumos">
                            <Boton variant="editar">Marcas de insumos</Boton>
                        </Link>
                    )
                }
            />

            {respuesta?.error && (
                <p className={estilos.mensajeError}>No se pudo cargar el rotulado frontal de los productos.</p>
            )}

            {respuesta !== null && !respuesta.activo ? (
                <ModuloDesactivado />
            ) : (
                <>
                    {respuesta !== null && estados.length > 0 && (
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
                        gridTemplateColumns="1.4fr 1fr 1.5fr 2fr 1.5fr 0.9fr"
                        itemsPorPagina={10}
                        mensajeVacio={
                            respuesta === null
                                ? 'Cargando productos…'
                                : busqueda || filtro
                                  ? 'No hay productos con los filtros aplicados.'
                                  : 'Todavía no hay productos cargados.'
                        }
                        columnaOrdenInicial="producto"
                        tituloExportacion="rotulado_frontal"
                    />
                </>
            )}
        </div>
    );
}
