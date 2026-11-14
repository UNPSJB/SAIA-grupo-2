import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import type { LoteProduccion, InsumoAsociado } from '../../types/lotesProduccion';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import { ETIQUETA_TIPO_PRODUCTO, formatearCantidad, formatearFecha, hoyLocal } from '../productos/formatoProducto';

import type { Insumo } from '../../types/insumos';
import { getInsumos } from '../../services/insumosServices';
import { getInsumosLote, asociarInsumoALote, quitarInsumoDeLote } from '../../services/lotesProduccionServices';


import ModalAlerta from '../../components/alerta';

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

    // Estados para los insumos del lote
    const [insumosUsados, setInsumosUsados] = useState<InsumoAsociado[]>([]);
    const [todosLosInsumos, setTodosLosInsumos] = useState<Insumo[]>([]);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [insumoIdSeleccionado, setInsumoIdSeleccionado] = useState('');
    const [cantidadGramos, setCantidadGramos] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [alerta, setAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });
    const hoy = hoyLocal();
    //permitir modificar solo los lotes creados ese dia
    const permiteModificar = lote.fecha === hoy;

    const cargarInsumosLote = async () => {
        try {
            const datos = await getInsumosLote(lote.nro_lote);
            setInsumosUsados(datos);
        } catch (error: any) {
            console.error("Error al cargar insumos del lote:", error);
        }
    };
    //lista insumos para el select
    const cargarMaestroInsumos = async () => {
        try {
            const data = await getInsumos();
            // Filtramos solo los activos
            setTodosLosInsumos(data.filter((i) => i.activo !== false));
        } catch (error) {
            console.error("Error al cargar maestro de insumos:", error);
        }
    };




    useEffect(() => {
        cargarInsumosLote();
        cargarMaestroInsumos();
    }, [lote.nro_lote]);

    useEffect(() => {
        const alPresionar = (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', alPresionar);
        return () => window.removeEventListener('keydown', alPresionar);
    }, [onClose]);



    // Asociar insumo al lote
    const handleAsociar = async (e: React.FormEvent) => {
        e.preventDefault();
        const gramos = parseFloat(cantidadGramos);
        if (!insumoIdSeleccionado || isNaN(gramos) || gramos <= 0) {
            setAlerta({
                isOpen: true,
                titulo: "Datos incompletos",
                mensaje: "Seleccioná un insumo y una cantidad válida mayor a 0 gramos."
            });
            return;
        }
        try {
            setGuardando(true);
            await asociarInsumoALote(lote.nro_lote, {
                insumo_id: Number(insumoIdSeleccionado),
                cantidad_utilizada: gramos
            });
            setCantidadGramos('');
            setInsumoIdSeleccionado('');
            setMostrarForm(false);
            await cargarInsumosLote();
        } catch (error: any) {
            setAlerta({
                isOpen: true,
                titulo: "No se pudo asociar",
                mensaje: error.message || "Ocurrió un error al asociar el insumo."
            });
        } finally {
            setGuardando(false);
        }
    };
    // Quitar insumo del lote
    const handleQuitar = async (insumoId: number) => {
        try {
            await quitarInsumoDeLote(lote.nro_lote, insumoId);
            await cargarInsumosLote();
        } catch (error: any) {
            setAlerta({
                isOpen: true,
                titulo: "Error",
                mensaje: error.message || "No se pudo quitar el insumo."
            });
        }
    };




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
 <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Insumos Utilizados</h3>
                    {permiteModificar && !mostrarForm && (
                        <Boton type="button" variant="crear" onClick={() => setMostrarForm(true)}>
                            Insumo
                        </Boton>
                    )}
                </div>
                {/* Formulario para asociar un nuevo insumo */}
                {mostrarForm && (
                    <form onSubmit={handleAsociar} style={{ background: 'var(--bg)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border)' }}>
                        <div style={{ marginBottom: '12px' }}>
                            <label className={styles.modalTituloCampo} style={{ fontSize: '0.9rem' }}>Insumo:</label>
                            <select
                                className={styles.modalSelector}
                                value={insumoIdSeleccionado}
                                onChange={(e) => setInsumoIdSeleccionado(e.target.value)}
                                required
                            >
                                <option value="">Seleccione un insumo...</option>
                                {todosLosInsumos.map((ins) => (
                                    <option key={ins.id} value={ins.id}>
                                        {ins.nombre} ({ins.cantidad ?? 0}g disponibles)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label className={styles.modalTituloCampo} style={{ fontSize: '0.9rem' }}>Cantidad utilizada (en gramos):</label>
                            <input
                                type="number"
                                min="0.1"
                                step="any"
                                required
                                placeholder="Ej: 250"
                                value={cantidadGramos}
                                onChange={(e) => setCantidadGramos(e.target.value)}
                                style={{ width: '100%', marginTop: '6px' }}
                            />
                        </div>
                        <div className={styles.filaBotones}>
                            <Boton type="submit" variant="guardar" disabled={guardando}>
                                {guardando ? "Asociando..." : "Asociar"}
                            </Boton>
                            <Boton type="button" variant="volver" onClick={() => setMostrarForm(false)}>
                                Cancelar
                            </Boton>
                        </div>
                    </form>
                )}
                {/* Lista de insumos asociados */}
                {insumosUsados.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                        No hay insumos asociados a este lote todavía.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {insumosUsados.map((item) => (
                            <div
                                key={item.insumo_id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 12px',
                                    background: 'var(--bg)',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)'
                                }}
                            >
                                <span><strong>{item.nombre}</strong>: {item.cantidad_utilizada} g</span>
                                {permiteModificar && (
                                    <Boton
                                        type="button"
                                        variant="eliminar"
                                        title="Quitar insumo"
                                        onClick={() => handleQuitar(item.insumo_id)}
                                    >
                                    </Boton>
                                )}
                            </div>
                        ))}

                        {/* Mensaje aclaratorio si es un lote pasado */}
                        {!permiteModificar && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>
                                Registro cerrado. Solo se admiten correcciones en lotes del día.
                            </span>
                        )}


                        
                    </div>
                )}
                <div className={styles.filaBotones} style={{ marginTop: '24px' }}>
                    {acciones}
                    <Boton variant="volver" onClick={onClose}>
                        Cerrar
                    </Boton>
                </div>
            </section>
            <ModalAlerta
                isOpen={alerta.isOpen}
                titulo={alerta.titulo}
                mensaje={alerta.mensaje}
                onClose={() => setAlerta({ ...alerta, isOpen: false })}
            />
        </div>
    );
}