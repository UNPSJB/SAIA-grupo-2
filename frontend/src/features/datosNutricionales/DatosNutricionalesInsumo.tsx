import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

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
import EncabezadoPagina from '../../components/EncabezadoPagina';
import BuscarAlimentoModal from './BuscarAlimentoModal';
import { porCadaCien } from '../insumos/cantidades';
import {
    ETIQUETA_FUENTE,
    FUENTES,
    NUTRIENTES,
    NUTRIENTES_SARA2,
    formatearFechaHora,
    formatearValor,
    nombreCompleto,
} from './nutrientes';
import estilos from './DatosNutricionales.module.css';
import styles from '../../styles/shared.module.css';

interface Fila {
    valor: string;
    fuente: FuenteDatoNutricional;
    alimento: AlimentoResumen | null;
    referencia: string;
}

type Filas = Record<Nutriente, Fila>;

interface Respuesta {
    clave: string;
    datos: DatosInsumo | null;
    error: boolean;
}

interface Aviso {
    tipo: 'exito' | 'error' | 'info';
    texto: string;
}

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

export default function DatosNutricionalesInsumo() {
    const { id = '' } = useParams();
    const { usuario } = useAuth();
    const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
    const [filas, setFilas] = useState<Filas>(() => filasDesde(null));
    const [buscando, setBuscando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [aviso, setAviso] = useState<Aviso | null>(null);
    const [intentoGuardar, setIntentoGuardar] = useState(false);

    useEffect(() => {
        let cancelado = false;

        getDatosNutricionales(id)
            .then((datos) => {
                if (cancelado) return;
                setRespuesta({ clave: id, datos, error: false });
                setFilas(filasDesde(datos));
            })
            .catch((problema) => {
                console.error('Error al cargar los datos nutricionales:', problema);
                if (!cancelado) setRespuesta({ clave: id, datos: null, error: true });
            });

        return () => {
            cancelado = true;
        };
    }, [id]);

    const actual = respuesta?.clave === id ? respuesta : null;
    const datosInsumo = actual?.datos ?? null;
    const porNutriente = new Map(datosInsumo?.datos.map((dato) => [dato.nutriente, dato]));
    const cambios = NUTRIENTES.filter((n) => filaCambio(filas[n.id], porNutriente.get(n.id)));
    const errores = NUTRIENTES.map((n) => [n.id, errorDeFila(filas[n.id])] as const).filter(([, error]) => error);
    const cargados = NUTRIENTES.filter((n) => porNutriente.has(n.id)).length;
    const advertencias = advertenciasDeConsistencia(filas);

    const actualizarFila = (nutriente: Nutriente, cambio: Partial<Fila>) => {
        setFilas((previas) => ({ ...previas, [nutriente]: { ...previas[nutriente], ...cambio } }));
        setAviso(null);
    };

    const aplicarAlimento = (alimento: AlimentoReferencia) => {
        const resumen: AlimentoResumen = {
            codigo: alimento.codigo,
            nombre: alimento.nombre,
            magnitud: alimento.magnitud,
            nombre_en_pdf: alimento.nombre_en_pdf,
        };
        const informados = NUTRIENTES.filter((n) => alimento[n.id] !== null);
        const faltantes = NUTRIENTES.filter((n) => alimento[n.id] === null);

        setFilas((previas) => {
            const nuevas = { ...previas };
            informados.forEach((n) => {
                nuevas[n.id] = { valor: String(alimento[n.id]), fuente: 'sara', alimento: resumen, referencia: '' };
            });
            return nuevas;
        });
        setBuscando(false);
        setAviso({
            tipo: 'info',
            texto:
                `Se completaron ${informados.length} valores desde SARA (${alimento.nombre}).` +
                (faltantes.length > 0
                    ? ` La base no informa ${faltantes.map((n) => n.etiqueta.toLowerCase()).join(', ')}: completalos desde otra fuente.`
                    : '') +
                ' Revisalos y guardá los cambios.',
        });
    };

    const descartar = () => {
        setFilas(filasDesde(datosInsumo));
        setAviso(null);
        setIntentoGuardar(false);
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
            const datos = await guardarDatosNutricionales(id, usuario.id, entradas);
            setRespuesta({ clave: id, datos, error: false });
            setFilas(filasDesde(datos));
            setIntentoGuardar(false);
            setAviso({
                tipo: 'exito',
                texto: `Se ${entradas.length === 1 ? 'guardó 1 dato' : `guardaron ${entradas.length} datos`}.`,
            });
        } catch (problema) {
            console.error('Error al guardar los datos nutricionales:', problema);
            setAviso({
                tipo: 'error',
                texto: problema instanceof Error ? problema.message : 'No se pudieron guardar los datos.',
            });
        } finally {
            setGuardando(false);
        }
    };

    if (actual === null) {
        return (
            <div className={styles.contenedorPrincipal}>
                <EncabezadoPagina titulo="Datos Nutricionales" />
                <p className={styles.textMuted}>Cargando datos del insumo…</p>
            </div>
        );
    }

    if (datosInsumo === null) {
        return (
            <div className={styles.contenedorPrincipal}>
                <EncabezadoPagina titulo="Datos Nutricionales" />
                <p style={{ color: 'var(--rojo-texto)' }}>No se encontró el insumo.</p>
                <Link to="/datos-nutricionales">
                    <Boton variant="volver">Volver a la lista</Boton>
                </Link>
            </div>
        );
    }

    const magnitud = datosInsumo.insumo.magnitud;
    const cadaCien = porCadaCien(magnitud);

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo={`Datos Nutricionales: ${datosInsumo.insumo.nombre}`}
                descripcion={`Valores cada ${cadaCien}. ${cargados} de ${NUTRIENTES.length} datos cargados. Cada dato guarda su fuente, la fecha de carga y quién lo cargó o modificó.`}
                acciones={
                    <Boton variant="buscar" onClick={() => setBuscando(true)}>
                        Completar desde SARA
                    </Boton>
                }
            />

            <p className={estilos.aviso}>
                <strong>Si el insumo se usa como aditivo</strong>, no hace falta cargar estos datos: alcanza con el valor
                energético y el sodio cuando su aporte sea relevante (por ejemplo, el bicarbonato).
            </p>

            <section className={`${styles.tarjetaEstatica} ${estilos.tarjeta}`} aria-label={`Datos nutricionales cada ${cadaCien}`}>
                <div className={estilos.encabezadoTabla} aria-hidden="true">
                    <span>Nutriente</span>
                    <span>Valor cada {cadaCien}</span>
                    <span>Fuente</span>
                    <span>Registro</span>
                </div>

                {NUTRIENTES.map((nutriente) => {
                    const fila = filas[nutriente.id];
                    const dato = porNutriente.get(nutriente.id);
                    const cambio = filaCambio(fila, dato);
                    const error = intentoGuardar ? errorDeFila(fila) : null;
                    const idCampo = `valor-${nutriente.id}`;

                    return (
                        <div key={nutriente.id} className={`${estilos.fila} ${cambio ? estilos.filaEditada : ''}`}>
                            <label
                                htmlFor={idCampo}
                                className={`${estilos.nombreNutriente} ${nutriente.subnivel ? estilos.subnivel : ''}`}
                            >
                                {nutriente.etiqueta}
                            </label>

                            <div>
                                <div className={estilos.campoValor}>
                                    <input
                                        id={idCampo}
                                        type="number"
                                        min="0"
                                        step="any"
                                        inputMode="decimal"
                                        placeholder="Sin dato"
                                        value={fila.valor}
                                        onChange={(evento) => actualizarFila(nutriente.id, { valor: evento.target.value })}
                                        aria-invalid={Boolean(error)}
                                        style={error ? { borderColor: '#ef4444' } : undefined}
                                    />
                                    <span className={estilos.unidad}>{nutriente.unidad}</span>
                                </div>
                                {error && <span className={estilos.mensajeError} style={{ fontSize: '0.8rem' }}>{error}</span>}
                            </div>

                            <div className={estilos.origen}>
                                <span className={estilos.etiquetaCampo}>Fuente</span>
                                <select
                                    aria-label={`Fuente de ${nutriente.etiqueta.toLowerCase()}`}
                                    value={fila.fuente}
                                    onChange={(evento) =>
                                        actualizarFila(nutriente.id, { fuente: evento.target.value as FuenteDatoNutricional })
                                    }
                                >
                                    {FUENTES.map((fuente) => (
                                        <option key={fuente} value={fuente} disabled={fuente === 'sara' && !fila.alimento}>
                                            {ETIQUETA_FUENTE[fuente]}
                                        </option>
                                    ))}
                                </select>
                                {fila.fuente === 'sara' && fila.alimento ? (
                                    <span className={estilos.referenciaSara}>
                                        {NUTRIENTES_SARA2.includes(nutriente.id) && fila.alimento.nombre_en_pdf
                                            ? `${fila.alimento.nombre} · PDF: ${fila.alimento.nombre_en_pdf}`
                                            : fila.alimento.nombre}
                                        {fila.alimento.magnitud !== magnitud ? ` (SARA lo informa cada ${porCadaCien(fila.alimento.magnitud)})` : ''}
                                    </span>
                                ) : (
                                    <input
                                        type="text"
                                        maxLength={200}
                                        placeholder="Referencia (ej: marca o publicación)"
                                        aria-label={`Referencia de ${nutriente.etiqueta.toLowerCase()}`}
                                        value={fila.referencia}
                                        onChange={(evento) => actualizarFila(nutriente.id, { referencia: evento.target.value })}
                                    />
                                )}
                            </div>

                            <div className={estilos.auditoria}>
                                <span className={estilos.etiquetaCampo}>Registro</span>
                                {dato ? (
                                    <>
                                        <span>
                                            Cargado por {nombreCompleto(dato.cargado_por)} · {formatearFechaHora(dato.fecha_carga)}
                                        </span>
                                        {dato.modificado && dato.modificado_por && dato.fecha_modificacion && (
                                            <span
                                                className={estilos.marcaModificado}
                                                title={`Valor original de la fuente: ${formatearValor(dato.valor_fuente)} ${dato.unidad}`}
                                            >
                                                <i className="bi bi-pencil" aria-hidden="true"></i>
                                                Modificado por {nombreCompleto(dato.modificado_por)} ·{' '}
                                                {formatearFechaHora(dato.fecha_modificacion)} (fuente: {formatearValor(dato.valor_fuente)}{' '}
                                                {dato.unidad})
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className={estilos.sinDato}>Sin cargar</span>
                                )}
                                {cambio && (
                                    <span className={estilos.pendiente}>
                                        {fila.valor.trim() === '' ? 'Se borrará al guardar' : 'Cambio sin guardar'}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}

                {aviso && (
                    <p
                        role={aviso.tipo === 'error' ? 'alert' : 'status'}
                        className={aviso.tipo === 'exito' ? estilos.mensajeExito : aviso.tipo === 'error' ? estilos.mensajeError : styles.textMuted}
                        style={aviso.tipo === 'info' ? { margin: '12px 0 0' } : undefined}
                    >
                        {aviso.texto}
                    </p>
                )}
                {advertencias.length > 0 && (
                    <div className={estilos.advertencia} role="status">
                        <strong>Revisá estos valores</strong> (se pueden guardar igual; suele pasar al combinar fuentes distintas):
                        <ul>
                            {advertencias.map((texto) => <li key={texto}>{texto}</li>)}
                        </ul>
                    </div>
                )}
                {intentoGuardar && errores.length > 0 && (
                    <p role="alert" className={estilos.mensajeError}>
                        Revisá los valores marcados antes de guardar.
                    </p>
                )}

                <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                    <Boton variant="guardar" onClick={guardar} disabled={guardando || cambios.length === 0}>
                        {guardando
                            ? 'Guardando...'
                            : cambios.length === 0
                              ? 'Sin cambios'
                              : `Guardar ${cambios.length === 1 ? '1 cambio' : `${cambios.length} cambios`}`}
                    </Boton>
                    {cambios.length > 0 && (
                        <Boton variant="eliminar" onClick={descartar} disabled={guardando}>
                            Descartar cambios
                        </Boton>
                    )}
                    <Link to="/datos-nutricionales">
                        <Boton variant="volver">Volver a la lista</Boton>
                    </Link>
                </div>
            </section>

            {buscando && (
                <BuscarAlimentoModal
                    busquedaInicial={datosInsumo.insumo.nombre.replace(/\d+/g, '').trim()}
                    magnitudInsumo={magnitud}
                    onAplicar={aplicarAlimento}
                    onClose={() => setBuscando(false)}
                />
            )}
        </div>
    );
}
