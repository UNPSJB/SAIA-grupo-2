import { useEffect, useState } from 'react';

import type { AlimentoReferencia, Nutriente } from '../../types/datosNutricionales';
import type { MagnitudUnidad } from '../../types/unidadesMedida';
import { buscarAlimentosReferencia } from '../../services/datosNutricionalesServices';
import Boton from '../../components/Boton';
import { porCadaCien } from '../insumos/cantidades';
import { NUTRIENTES, NUTRIENTES_SARA2, formatearValor } from './nutrientes';
import estilos from './BuscarAlimentoModal.module.css';
import styles from '../../styles/shared.module.css';

interface BuscarAlimentoModalProps {
    busquedaInicial: string;
    magnitudInsumo: MagnitudUnidad;
    onAplicar: (alimento: AlimentoReferencia) => void;
    onClose: () => void;
}

interface Resultados {
    termino: string;
    alimentos: AlimentoReferencia[];
    error: boolean;
}

const ESPERA_BUSQUEDA_MS = 250;

export default function BuscarAlimentoModal({ busquedaInicial, magnitudInsumo, onAplicar, onClose }: BuscarAlimentoModalProps) {
    const [busqueda, setBusqueda] = useState(busquedaInicial);
    const [resultados, setResultados] = useState<Resultados | null>(null);
    const [elegido, setElegido] = useState<AlimentoReferencia | null>(null);

    const termino = busqueda.trim();

    useEffect(() => {
        let cancelado = false;
        const temporizador = window.setTimeout(() => {
            buscarAlimentosReferencia(termino)
                .then((alimentos) => {
                    if (!cancelado) setResultados({ termino, alimentos, error: false });
                })
                .catch((problema) => {
                    console.error('Error al buscar en la base de referencia:', problema);
                    if (!cancelado) setResultados({ termino, alimentos: [], error: true });
                });
        }, ESPERA_BUSQUEDA_MS);

        return () => {
            cancelado = true;
            window.clearTimeout(temporizador);
        };
    }, [termino]);

    useEffect(() => {
        const alPresionar = (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', alPresionar);
        return () => window.removeEventListener('keydown', alPresionar);
    }, [onClose]);

    const buscando = resultados?.termino !== termino;
    const alimentos = resultados?.alimentos ?? [];
    const faltantes = elegido ? NUTRIENTES.filter((nutriente) => elegido[nutriente.id] === null) : [];
    const desdePdf = (alimento: AlimentoReferencia, nutriente: Nutriente) =>
        alimento.nombre_en_pdf !== null && NUTRIENTES_SARA2.includes(nutriente) && alimento[nutriente] !== null;

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
                aria-labelledby="titulo-buscar-alimento"
                className={styles.modalFormulario}
                style={{ maxWidth: '860px', textAlign: 'left' }}
            >
                <h2 id="titulo-buscar-alimento" style={{ marginTop: 0, color: 'var(--text-h)' }}>
                    Completar desde la base SARA
                </h2>
                <p className={styles.textMuted} style={{ marginTop: '-6px' }}>
                    Buscá el alimento más parecido al insumo. Los valores se cargan cada {porCadaCien(magnitudInsumo)} y
                    podés revisarlos antes de guardar.
                </p>

                <div className={estilos.cuerpo}>
                    <div>
                        <label htmlFor="buscar-alimento" style={{ fontWeight: 600, color: 'var(--text-h)' }}>
                            Alimento
                        </label>
                        <input
                            id="buscar-alimento"
                            type="text"
                            role="searchbox"
                            value={busqueda}
                            onChange={(evento) => setBusqueda(evento.target.value)}
                            placeholder="Ej: harina de trigo"
                            autoFocus
                            style={{ width: '100%', marginTop: '6px', boxSizing: 'border-box' }}
                        />
                        <ul className={estilos.resultados} aria-label="Resultados de la búsqueda">
                            {buscando && <li className={estilos.estado}>Buscando…</li>}
                            {!buscando && resultados?.error && (
                                <li className={estilos.estado}>No se pudo consultar la base de referencia.</li>
                            )}
                            {!buscando && !resultados?.error && alimentos.length === 0 && (
                                <li className={estilos.estado}>No hay alimentos que coincidan.</li>
                            )}
                            {!buscando &&
                                alimentos.map((alimento) => (
                                    <li key={alimento.codigo}>
                                        <button
                                            type="button"
                                            className={`${estilos.resultado} ${elegido?.codigo === alimento.codigo ? estilos.resultadoElegido : ''}`}
                                            onClick={() => setElegido(alimento)}
                                            aria-pressed={elegido?.codigo === alimento.codigo}
                                        >
                                            <span>{alimento.nombre}</span>
                                            <span className={estilos.codigo}>
                                                {alimento.magnitud === 'volumen' ? 'cada 100 ml · ' : ''}
                                                {alimento.codigo}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                        </ul>
                    </div>

                    <div className={estilos.vistaPrevia}>
                        {elegido ? (
                            <>
                                <h3>{elegido.nombre}</h3>
                                <span className={styles.textMuted} style={{ fontSize: '0.85rem' }}>
                                    Valores cada {porCadaCien(elegido.magnitud)} · código {elegido.codigo}
                                </span>
                                <dl className={estilos.valores}>
                                    {NUTRIENTES.map((nutriente) => {
                                        const valor = elegido[nutriente.id];
                                        return (
                                            <div key={nutriente.id} style={{ display: 'contents' }}>
                                                <dt>{nutriente.etiqueta}</dt>
                                                <dd className={valor === null ? estilos.noInforma : undefined}>
                                                    {valor === null ? 'No informa' : `${formatearValor(valor)} ${nutriente.unidad}`}
                                                    {desdePdf(elegido, nutriente.id) && (
                                                        <span className={estilos.marcaPdf} title="Tomado de la tabla SARA 2 (PDF)">*</span>
                                                    )}
                                                </dd>
                                            </div>
                                        );
                                    })}
                                </dl>
                                {elegido.nombre_en_pdf && (
                                    <p className={estilos.notaPdf}>
                                        * Azúcares y grasas trans tomados de la tabla SARA 2 (PDF): «{elegido.nombre_en_pdf}».
                                    </p>
                                )}
                                {elegido.magnitud !== magnitudInsumo && (
                                    <p className={estilos.advertencia}>
                                        SARA informa este alimento cada {porCadaCien(elegido.magnitud)}, pero el insumo se
                                        mide cada {porCadaCien(magnitudInsumo)}. Revisá los valores antes de guardar.
                                    </p>
                                )}
                                {faltantes.length > 0 && (
                                    <p className={estilos.advertencia}>
                                        La base no informa {faltantes.map((n) => n.etiqueta.toLowerCase()).join(', ')}: completalos
                                        desde el rótulo del proveedor u otra fuente.
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className={styles.textMuted}>Elegí un alimento de la lista para ver sus valores.</p>
                        )}
                    </div>
                </div>

                <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                    <Boton variant="guardar" disabled={!elegido} onClick={() => elegido && onAplicar(elegido)}>
                        Usar estos valores
                    </Boton>
                    <Boton variant="volver" onClick={onClose}>
                        Cancelar
                    </Boton>
                </div>
            </section>
        </div>
    );
}
