import { useEffect, useState } from 'react';
import type {
    AlimentoReferencia,
    AlimentoResumen,
    DatoNutricional,
    DatoNutricionalEntrada,
    DatosNutricionalesInsumo as DatosInsumo,
    FuenteDatoNutricional,
    Nutriente,
} from '../../types/datosNutricionales';
import { getDatosNutricionales, guardarDatosNutricionales } from '../../services/datosNutricionalesServices';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import BuscarAlimentoModal from './BuscarAlimentoModal';
import {
    ETIQUETA_FUENTE,
    FUENTES,
    NUTRIENTES,
    formatearValor,
} from './nutrientes';
import estilos from './DatosNutricionales.module.css';
import styles from '../../styles/shared.module.css';


// nota: esto es casi que una copia de DatosNutricionalesInsumo, no queria ponerme a modificar eso e intentar exportar a un componente o algo la logica compartida por no romper nada

interface Props {
    insumoId: number;
    insumoNombre: string;
    onClose: () => void;
    onGuardadoExitoso: () => void;
}

interface Fila {
    valor: string;
    fuente: FuenteDatoNutricional;
    alimento: AlimentoResumen | null;
    referencia: string;
}

type Filas = Record<Nutriente, Fila>;

const FUENTE_INICIAL: FuenteDatoNutricional = 'rotulo_proveedor';

function filaDesde(dato: DatoNutricional | undefined): Fila {
    if (!dato) return { valor: '', fuente: FUENTE_INICIAL, alimento: null, referencia: '' };
    return {
        valor: String(dato.valor),
        fuente: dato.fuente,
        alimento: dato.alimento,
        referencia: dato.referencia ?? '',
    };
}

function filasDesde(datos: DatosInsumo | null): Filas {
    const porNutriente = new Map(datos?.datos.map((dato) => [dato.nutriente, dato]));
    return Object.fromEntries(NUTRIENTES.map((n) => [n.id, filaDesde(porNutriente.get(n.id))])) as Filas;
}

function filaCambio(fila: Fila, dato: DatoNutricional | undefined): boolean {
    if (!dato) return fila.valor.trim() !== '';
    if (fila.valor.trim() === '') return true;
    return (
        Math.abs(Number(fila.valor) - dato.valor) > 0.0001 ||
        fila.fuente !== dato.fuente ||
        (fila.fuente === 'sara' ? fila.alimento?.codigo !== dato.alimento?.codigo : fila.referencia.trim() !== (dato.referencia ?? ''))
    );
}

function errorDeFila(fila: Fila): string | null {
    if (fila.valor.trim() === '') return null;
    const numero = Number(fila.valor);
    if (Number.isNaN(numero)) return 'Ingresá un número';
    if (numero < 0) return 'No puede ser negativo';
    if (fila.fuente === 'sara' && !fila.alimento) return 'Elegí el alimento de la base SARA';
    return null;
}

function numero(fila: Fila): number | null {
    const texto = fila.valor.trim();
    if (texto === '') return null;
    const valor = Number(texto);
    return Number.isNaN(valor) ? null : valor;
}

function advertenciasDeConsistencia(filas: Filas): string[] {
    const v = (nutriente: Nutriente) => numero(filas[nutriente]);
    const g = (valor: number) => `${formatearValor(valor)} g`;
    const advertencias: string[] = [];
    const comparar = (parte: Nutriente, todo: Nutriente, texto: string) => {
        const a = v(parte);
        const b = v(todo);
        if (a !== null && b !== null && a - b > 0.005) advertencias.push(`${texto} (${g(a)} contra ${g(b)}).`);
    };
    comparar('azucares_anadidos', 'azucares_totales', 'Los azúcares añadidos superan a los azúcares totales');
    comparar('azucares_totales', 'carbohidratos', 'Los azúcares totales superan a los carbohidratos');
    const grasas = v('grasas_totales');
    const subtipos = (v('grasas_saturadas') ?? 0) + (v('grasas_trans') ?? 0);
    if (grasas !== null && subtipos - grasas > 0.005) {
        advertencias.push(`Las grasas saturadas y trans suman más que las grasas totales (${g(subtipos)} contra ${g(grasas)}).`);
    }
    return advertencias;
}

export default function CompletarNutrientesModal({ insumoId, insumoNombre, onClose, onGuardadoExitoso }: Props) {
    const { usuario } = useAuth();
    const [cargando, setCargando] = useState(true);
    const [datosInsumo, setDatosInsumo] = useState<DatosInsumo | null>(null);
    const [filas, setFilas] = useState<Filas>(() => filasDesde(null));
    const [buscando, setBuscando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [intentoGuardar, setIntentoGuardar] = useState(false);

    useEffect(() => {
        let cancelado = false;
        setCargando(true);
        getDatosNutricionales(insumoId)
            .then((datos) => {
                if (cancelado) return;
                setDatosInsumo(datos);
                setFilas(filasDesde(datos));
                setCargando(false);
            })
            .catch((problema) => {
                console.error('Error al cargar datos nutricionales:', problema);
                if (!cancelado) {
                    setErrorMsg('No se pudieron cargar los datos nutricionales.');
                    setCargando(false);
                }
            });

        return () => {
            cancelado = true;
        };
    }, [insumoId]);

    const porNutriente = new Map(datosInsumo?.datos.map((dato) => [dato.nutriente, dato]));
    const cambios = NUTRIENTES.filter((n) => filaCambio(filas[n.id], porNutriente.get(n.id)));
    const errores = NUTRIENTES.map((n) => [n.id, errorDeFila(filas[n.id])] as const).filter(([, err]) => err);
    const advertencias = advertenciasDeConsistencia(filas);
    const magnitud = datosInsumo?.insumo.magnitud ?? 'masa';

    const actualizarFila = (nutriente: Nutriente, cambio: Partial<Fila>) => {
        setFilas((previas) => ({ ...previas, [nutriente]: { ...previas[nutriente], ...cambio } }));
        setErrorMsg(null);
    };

    const aplicarAlimento = (alimento: AlimentoReferencia) => {
        const resumen: AlimentoResumen = {
            codigo: alimento.codigo,
            nombre: alimento.nombre,
            magnitud: alimento.magnitud,
            nombre_en_pdf: alimento.nombre_en_pdf,
        };
        const informados = NUTRIENTES.filter((n) => alimento[n.id] !== null);
        setFilas((previas) => {
            const nuevas = { ...previas };
            informados.forEach((n) => {
                nuevas[n.id] = { valor: String(alimento[n.id]), fuente: 'sara', alimento: resumen, referencia: '' };
            });
            return nuevas;
        });
        setBuscando(false);
    };

    const guardar = async () => {
        setIntentoGuardar(true);
        if (!usuario || errores.length > 0 || cambios.length === 0) return;

        const entradas: DatoNutricionalEntrada[] = cambios.map((n) => {
            const fila = filas[n.id];
            const vacio = fila.valor.trim() === '';
            return {
                nutriente: n.id,
                valor: vacio ? null : Number(fila.valor),
                fuente: vacio ? (porNutriente.get(n.id)?.fuente ?? fila.fuente) : fila.fuente,
                alimento_codigo: fila.fuente === 'sara' ? fila.alimento?.codigo : null,
                referencia: fila.fuente === 'sara' ? null : fila.referencia.trim() || null,
            };
        });

        try {
            setGuardando(true);
            await guardarDatosNutricionales(insumoId, usuario.id, entradas);
            onGuardadoExitoso();
            onClose();
        } catch (problema) {
            console.error('Error al guardar datos:', problema);
            setErrorMsg(problema instanceof Error ? problema.message : 'Error al guardar.');
            setGuardando(false);
        }
    };

    return (
        <div
            className={styles.modalOverlay}
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-completar-datos"
                className={styles.modalFormulario}
                style={{ maxWidth: '860px', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <h2 id="titulo-completar-datos" style={{ margin: '0 0 4px', color: 'var(--text-h)' }}>
                            Completar datos nutricionales: {insumoNombre}
                        </h2>
                        <p className={styles.textMuted} style={{ margin: 0 }}>
                            Completá los valores y la fuente registrada por cada 100 {magnitud === 'volumen' ? 'ml' : 'g'}.
                        </p>
                    </div>
                    <Boton variant="documentos" onClick={() => setBuscando(true)}>
                        Buscar en base SARA
                    </Boton>
                </div>

                {cargando ? (
                    <p className={styles.textMuted} style={{ margin: '24px 0' }}>Cargando datos del insumo...</p>
                ) : (
                    <div style={{ marginTop: '16px' }}>
                        {NUTRIENTES.map((nutriente) => {
                            const fila = filas[nutriente.id];
                            const error = intentoGuardar ? errorDeFila(fila) : null;
                            const esSara = fila.fuente === 'sara';

                            return (
                                <div
                                    key={nutriente.id}
                                    className={`${estilos.fila} ${fila.valor.trim() === '' ? estilos.sinDato : ''}`}
                                    style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}
                                >
                                    <div className={`${estilos.nombreNutriente} ${nutriente.subnivel ? estilos.subnivel : ''}`}>
                                        <strong>{nutriente.etiqueta}</strong>
                                    </div>

                                    <div className={estilos.campoValor}>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            aria-label={`${nutriente.etiqueta} (${nutriente.unidad})`}
                                            value={fila.valor}
                                            onChange={(e) => actualizarFila(nutriente.id, { valor: e.target.value })}
                                            className={error ? styles.inputError : styles.input}
                                            style={{ width: '90px' }}
                                            placeholder="—"
                                        />
                                        <span className={estilos.unidad}>{nutriente.unidad}</span>
                                    </div>

                                    <div className={estilos.origen}>
                                        <select
                                            aria-label={`Fuente de ${nutriente.etiqueta}`}
                                            value={fila.fuente}
                                            onChange={(e) =>
                                                actualizarFila(nutriente.id, {
                                                    fuente: e.target.value as FuenteDatoNutricional,
                                                    alimento: e.target.value === 'sara' ? fila.alimento : null,
                                                })
                                            }
                                            className={styles.select}
                                            style={{ minWidth: '150px' }}
                                        >
                                            {FUENTES.map((f) => (
                                                <option key={f} value={f}>
                                                    {ETIQUETA_FUENTE[f]}
                                                </option>
                                            ))}
                                        </select>

                                        {esSara ? (
                                            <span className={estilos.referenciaSara}>
                                                {fila.alimento ? `${fila.alimento.codigo} · ${fila.alimento.nombre}` : 'Sin alimento asignado'}
                                            </span>
                                        ) : (
                                            <input
                                                type="text"
                                                aria-label={`Referencia de ${nutriente.etiqueta}`}
                                                value={fila.referencia}
                                                onChange={(e) => actualizarFila(nutriente.id, { referencia: e.target.value })}
                                                className={styles.input}
                                                placeholder={fila.fuente === 'rotulo_proveedor' ? 'Marca / lote' : 'Detalle bibliográfico'}
                                                style={{ flex: 1 }}
                                            />
                                        )}
                                    </div>

                                    {error && (
                                        <div style={{ gridColumn: '1 / -1', color: '#b91c1c', fontSize: '0.8rem' }}>
                                            {error}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {advertencias.length > 0 && (
                            <div className={estilos.advertencia} style={{ marginTop: '14px' }}>
                                <strong>Revisá estos valores:</strong>
                                <ul>
                                    {advertencias.map((a) => (
                                        <li key={a}>{a}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {errorMsg && (
                            <p role="alert" className={estilos.mensajeError} style={{ marginTop: '12px' }}>
                                {errorMsg}
                            </p>
                        )}

                        <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                            <Boton variant="guardar" onClick={guardar} disabled={guardando || cambios.length === 0}>
                                {guardando ? 'Guardando...' : `Guardar ${cambios.length === 1 ? '1 cambio' : `${cambios.length} cambios`}`}
                            </Boton>
                            <Boton variant="volver" onClick={onClose} disabled={guardando}>
                                Cancelar
                            </Boton>
                        </div>
                    </div>
                )}

                {buscando && (
                    <BuscarAlimentoModal
                        busquedaInicial={insumoNombre.replace(/\d+/g, '').trim()}
                        magnitudInsumo={magnitud}
                        onAplicar={aplicarAlimento}
                        onClose={() => setBuscando(false)}
                    />
                )}
            </section>
        </div>
    );
}