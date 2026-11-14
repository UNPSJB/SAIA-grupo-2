import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import type { LoteProduccion, InsumoAsociado } from '../../types/lotesProduccion';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import { ETIQUETA_TIPO_PRODUCTO, formatearCantidad, formatearFecha } from '../productos/formatoProducto';
import { cerrarLote, getInsumosLote } from '../../services/lotesProduccionServices';
import ListaInsumosLote from './ListaInsumosLote';
import CorregirConsumoLote from './CorregirConsumoLote';
import { textoEstado } from './estadoLote';

import estilos from './LoteDetalleModal.module.css';
import estilosInsumos from './InsumosLote.module.css';
import styles from '../../styles/shared.module.css';

interface LoteDetalleModalProps {
    lote: LoteProduccion;
    subtitulo?: string;
    enlazarProducto?: boolean;
    acciones?: ReactNode;
    onActualizado?: (lote: LoteProduccion) => void;
    onClose: () => void;
}

type Modo = 'ver' | 'corregir' | 'confirmarCierre';

export default function LoteDetalleModal({
    lote,
    subtitulo,
    enlazarProducto = true,
    acciones,
    onActualizado,
    onClose,
}: LoteDetalleModalProps) {
    const { usuario } = useAuth();
    const mostrarEnlace = enlazarProducto && usuario?.rol === 'admin';

    const [loteActual, setLoteActual] = useState(lote);
    const [insumosUsados, setInsumosUsados] = useState<InsumoAsociado[] | null>(null);
    const [modo, setModo] = useState<Modo>('ver');
    const [version, setVersion] = useState(0);
    const [errorCierre, setErrorCierre] = useState('');
    const [cerrando, setCerrando] = useState(false);

    useEffect(() => {
        let cancelado = false;
        getInsumosLote(lote.nro_lote)
            .then((usados) => {
                if (!cancelado) setInsumosUsados(usados);
            })
            .catch((problema) => {
                console.error('Error al cargar los insumos del lote:', problema);
                if (!cancelado) setInsumosUsados([]);
            });
        return () => {
            cancelado = true;
        };
    }, [lote.nro_lote, version]);

    const actualizar = (nuevo: LoteProduccion) => {
        setLoteActual(nuevo);
        onActualizado?.(nuevo);
    };

    const consumoCorregido = (nuevo: LoteProduccion) => {
        actualizar(nuevo);
        setModo('ver');
        setVersion((v) => v + 1);
    };

    const confirmarCierre = async () => {
        if (!usuario) return;
        setCerrando(true);
        setErrorCierre('');
        try {
            actualizar(await cerrarLote(loteActual.nro_lote, usuario.id));
            setModo('ver');
        } catch (problema) {
            setErrorCierre(problema instanceof Error ? problema.message : 'No se pudo cerrar el lote.');
        } finally {
            setCerrando(false);
        }
    };

    const abierto = !loteActual.cerrado;

    useEffect(() => {
        const alPresionar = (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', alPresionar);
        return () => window.removeEventListener('keydown', alPresionar);
    }, [onClose]);

    return (
        <div
            className={styles.modalOverlay}
            role="presentation"
            onClick={(evento) => {
                if (evento.target === evento.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-lote"
                className={styles.modalFormulario}
                style={{ maxWidth: '520px' }}
            >
                <div className={estilos.encabezado}>
                    <div>
                        <h2 id="titulo-lote">Lote N.º {lote.nro_lote}</h2>
                        {subtitulo && <p className={estilos.subtitulo}>{subtitulo}</p>}
                    </div>
                </div>

                <dl className={estilos.datos}>
                    <dt>Producto</dt>
                    <dd>
                        {mostrarEnlace ? (
                            <Link to={`/productos/${lote.producto.id}`} className={estilos.enlaceProducto} onClick={onClose}>
                                {lote.producto.nombre}
                            </Link>
                        ) : (
                            lote.producto.nombre
                        )}
                    </dd>

                    <dt>Tipo</dt>
                    <dd>{ETIQUETA_TIPO_PRODUCTO[lote.producto.tipo]}</dd>

                    <dt>Fecha de producción</dt>
                    <dd>{formatearFecha(lote.fecha)}</dd>

                    <dt>Cantidad producida</dt>
                    <dd>{formatearCantidad(lote.cantidad, lote.producto.unidad_medida.nombre)}</dd>

                    <dt>Estado</dt>
                    <dd>
                        <span className={`${estilosInsumos.estado} ${abierto ? estilosInsumos.estadoAbierto : estilosInsumos.estadoCerrado}`}>
                            {abierto ? 'Abierto' : 'Cerrado'}
                        </span>
                        <span className={estilosInsumos.detalleEstado}>{textoEstado(loteActual)}</span>
                    </dd>
                </dl>

                <section className={estilosInsumos.seccion} aria-labelledby="titulo-insumos-del-lote">
                    <div className={estilosInsumos.encabezadoSeccion}>
                        <h3 id="titulo-insumos-del-lote">Insumos utilizados</h3>
                        {abierto && modo === 'ver' && insumosUsados !== null && (
                            <div className={estilosInsumos.botonesEncabezado}>
                                <Boton variant="editar" onClick={() => setModo('corregir')}>Corregir consumo</Boton>
                                <Boton variant="guardar" onClick={() => setModo('confirmarCierre')}>Cerrar lote</Boton>
                            </div>
                        )}
                    </div>
                    {insumosUsados === null ? (
                        <p className={estilosInsumos.vacio}>Cargando insumos…</p>
                    ) : abierto && modo === 'corregir' ? (
                        <CorregirConsumoLote
                            nroLote={loteActual.nro_lote}
                            consumo={insumosUsados}
                            onGuardado={consumoCorregido}
                            onCancelar={() => setModo('ver')}
                        />
                    ) : (
                        <ListaInsumosLote
                            items={insumosUsados.map((item) => ({
                                insumoId: item.insumo_id,
                                nombre: item.nombre,
                                cantidadBase: item.cantidad_utilizada,
                                magnitud: item.magnitud,
                            }))}
                            mensajeVacio="No se declararon insumos para este lote."
                        />
                    )}
                    {abierto && modo === 'confirmarCierre' && (
                        <div className={estilosInsumos.confirmacion} role="alertdialog" aria-label="Confirmar cierre del lote">
                            <p>
                                ¿Cerrar el lote N.º {loteActual.nro_lote}? Después nadie va a poder corregir su consumo.
                            </p>
                            {errorCierre && <p className={estilosInsumos.errorRenglon} role="alert">{errorCierre}</p>}
                            <div className={estilosInsumos.accionesCorreccion}>
                                <Boton variant="volver" onClick={() => setModo('ver')} disabled={cerrando}>Cancelar</Boton>
                                <Boton variant="guardar" onClick={confirmarCierre} disabled={cerrando}>
                                    {cerrando ? 'Cerrando...' : 'Sí, cerrar lote'}
                                </Boton>
                            </div>
                        </div>
                    )}
                </section>
                <div className={styles.filaBotones} style={{ marginTop: '24px' }}>
                    {acciones}
                    <Boton variant="volver" onClick={onClose}>
                        Volver
                    </Boton>
                </div>
            </section>
        </div>
    );
}