import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import type { LoteProduccion } from '../../types/lotesProduccion';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import { ETIQUETA_TIPO_PRODUCTO, formatearCantidad, formatearFecha } from '../productos/formatoProducto';
import estilos from './LoteDetalleModal.module.css';
import styles from '../../styles/shared.module.css';

interface LoteDetalleModalProps {
    lote: LoteProduccion;
    subtitulo?: string;
    enlazarProducto?: boolean;
    acciones?: ReactNode;
    onClose: () => void;
}

export default function LoteDetalleModal({
    lote,
    subtitulo,
    enlazarProducto = true,
    acciones,
    onClose,
}: LoteDetalleModalProps) {
    const { usuario } = useAuth();
    const mostrarEnlace = enlazarProducto && usuario?.rol === 'admin';

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
                </dl>

                <div className={styles.filaBotones} style={{ marginTop: '24px' }}>
                    {acciones}
                    <Boton variant="volver" onClick={onClose}>
                        Cerrar
                    </Boton>
                </div>
            </section>
        </div>
    );
}
