import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import type { EscaladoRecetaPayload, EscalarRecetaProps, RecetaEscalada } from "../../types/recetas";
import type { EstadoLoteDesdeReceta } from "../../types/lotesProduccion";
import { escalarRecetaProducto } from "../../services/recetasServices";
import { formatearStock } from "../insumos/cantidades";
import Boton from "../../components/Boton";
import estilos from './EscalarReceta.module.css';
import styles from '../../styles/shared.module.css';

type ModoEscalado = 'factor' | 'cantidad' | 'unidades';

const ETIQUETA_VALOR: Record<ModoEscalado, string> = {
    factor: 'Factor (ej: 1.5, 2):',
    cantidad: 'Cantidad objetivo (g):',
    unidades: 'Unidades a producir:',
};

const EJEMPLO_VALOR: Record<ModoEscalado, string> = {
    factor: 'Ej: 2',
    cantidad: 'Ej: 2500',
    unidades: 'Ej: 40',
};

function payloadDe(modo: ModoEscalado, numero: number): EscaladoRecetaPayload {
    if (modo === 'cantidad') return { cantidad_objetivo: numero };
    if (modo === 'unidades') return { unidades_objetivo: numero };
    return { factor: numero };
}

function formatear(valor: number): string {
    return valor.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

export default function EscalarReceta({
    productoId,
    rutaNuevoLote = '/lotes-produccion/nuevo',
}: EscalarRecetaProps) {
    const navigate = useNavigate();

    const [modo, setModo] = useState<ModoEscalado>('factor');
    const [valor, setValor] = useState<string>('1');
    const [resultado, setResultado] = useState<RecetaEscalada | null>(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCalcular = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        const numero = Number(valor);
        if (valor.trim() === '' || Number.isNaN(numero) || numero <= 0) {
            setError('Ingresá un valor mayor a 0.');
            return;
        }

        try {
            setCargando(true);
            const datos = await escalarRecetaProducto(productoId, payloadDe(modo, numero));
            setResultado(datos);
        } catch (err) {
            console.error('Error al escalar receta:', err);
            setError(err instanceof Error ? err.message : 'Error al calcular el escalado.');
            setResultado(null);
        } finally {
            setCargando(false);
        }
    };

    const handleIniciarLote = () => {
        if (!resultado) return;

        const estadoLote: EstadoLoteDesdeReceta = {
            producto_id: resultado.producto_id,
            cantidad: resultado.cantidad_producto,
            rendimiento_gramos: resultado.rendimiento_esperado,
            receta_id: resultado.receta_id,
            receta_version_id: resultado.receta_version_id,
            factor_escalado: resultado.factor_aplicado,
            insumos: resultado.renglones.map((r) => ({
                insumo_id: r.insumo_id,
                cantidad_utilizada: r.cantidad_escalada,
                unidad_medida_id: r.unidad_medida_id,
            })),
        };

        navigate(rutaNuevoLote, { state: estadoLote });
    };

    const hayFaltanteStock = resultado?.renglones.some((r) => !r.stock_suficiente) ?? false;
    const unidadProducto = resultado?.unidad_producto_nombre.toLowerCase();

    return (
        <section className={styles.formularioTarjeta} aria-labelledby="titulo-escalar-receta">
            <h3 id="titulo-escalar-receta" className={estilos.titulo}>
                Escalar receta
            </h3>
            <p className={`${styles.textMuted} ${estilos.descripcion}`}>
                Calculá las cantidades exactas de ingredientes según la producción de hoy. No modifica la receta original.
            </p>

            <form onSubmit={handleCalcular} className={estilos.formulario}>
                <div className={`${styles.formGroup} ${estilos.campo}`}>
                    <label htmlFor="modo-escalado">Escalar por:</label>
                    <select
                        id="modo-escalado"
                        value={modo}
                        onChange={(e) => {
                            setModo(e.target.value as ModoEscalado);
                            setValor('');
                            setResultado(null);
                            setError(null);
                        }}
                    >
                        <option value="factor">Factor multiplicador (ej: x2)</option>
                        <option value="cantidad">Cantidad objetivo (gramos)</option>
                        <option value="unidades">Cantidad de unidades</option>
                    </select>
                </div>

                <div className={`${styles.formGroup} ${estilos.campo}`}>
                    <label htmlFor="valor-escalado">{ETIQUETA_VALOR[modo]}</label>
                    <input
                        id="valor-escalado"
                        type="number"
                        min="0"
                        step={modo === 'unidades' ? '1' : 'any'}
                        placeholder={EJEMPLO_VALOR[modo]}
                        value={valor}
                        onChange={(e) => {
                            setValor(e.target.value);
                            setResultado(null);
                        }}
                    />
                </div>

                <Boton type="submit" variant="ver" disabled={cargando}>
                    {cargando ? 'Calculando...' : 'Calcular'}
                </Boton>
            </form>

            {error && (
                <p role="alert" className={estilos.error}>
                    {error}
                </p>
            )}

            {resultado && (
                <div className={estilos.resultado}>
                    <div className={estilos.resumen}>
                        <span>
                            <strong>Rendimiento base:</strong> {formatear(resultado.rendimiento_original)} g
                        </span>
                        <span>
                            <strong>Rendimiento esperado:</strong> {formatear(resultado.rendimiento_esperado)} g
                            {resultado.cantidad_producto !== null &&
                                ` (${formatear(resultado.cantidad_producto)} ${unidadProducto}${
                                    resultado.peso_unidad_gramos !== null
                                        ? ` de ${formatear(resultado.peso_unidad_gramos)} g`
                                        : ''
                                })`}
                        </span>
                        <span>
                            <strong>Factor aplicado:</strong> x{formatear(resultado.factor_aplicado)}
                        </span>
                    </div>

                    <div className={estilos.desplazable}>
                        <table className={estilos.tabla}>
                            <thead>
                                <tr>
                                    <th>Insumo</th>
                                    <th>Original</th>
                                    <th>Escalado</th>
                                    <th>Stock disponible</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {resultado.renglones.map((renglon) => (
                                    <tr key={renglon.insumo_id}>
                                        <td className={estilos.nombreInsumo}>{renglon.insumo_nombre}</td>
                                        <td>
                                            {formatear(renglon.cantidad_original)} {renglon.unidad_medida_nombre}
                                        </td>
                                        <td className={estilos.cantidadEscalada}>
                                            {formatear(renglon.cantidad_escalada)} {renglon.unidad_medida_nombre}
                                        </td>
                                        <td>{formatearStock(renglon.stock_disponible, renglon.magnitud)}</td>
                                        <td>
                                            {renglon.stock_suficiente ? (
                                                <span className={estilos.disponible}>Disponible</span>
                                            ) : (
                                                <span className={estilos.insuficiente}>Stock insuficiente</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {hayFaltanteStock && (
                        <p className={estilos.aviso}>
                            Algunos insumos no tienen stock suficiente. Podés iniciar el lote igualmente y ajustar las
                            cantidades en el formulario.
                        </p>
                    )}

                    {resultado.cantidad_producto === null && (
                        <p className={estilos.aviso}>
                            El producto se mide en {unidadProducto} y no hay equivalencia con los gramos de la receta:
                            completá a mano la cantidad producida del lote.
                        </p>
                    )}

                    <div className={`${styles.filaBotones} ${estilos.acciones}`}>
                        <Boton variant="crear" onClick={handleIniciarLote}>
                            Iniciar lote con estas cantidades
                        </Boton>
                    </div>
                </div>
            )}
        </section>
    );
}
