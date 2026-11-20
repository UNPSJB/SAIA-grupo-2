import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import type { EscalarRecetaProps, RecetaEscalada } from "../../types/recetas";
import type { EstadoLoteDesdeReceta } from "../../types/lotesProduccion";
import { escalarRecetaProducto } from "../../services/recetasServices";
import { formatearStock } from "../insumos/cantidades";
import Boton from "../../components/Boton";
import styles from '../../styles/shared.module.css';


type ModoEscalado = 'cantidad' | 'factor';

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
            return
        }

        try {
            setCargando(true);
            const payload =
                modo === 'cantidad' ? { cantidad_objetivo: numero } : { factor: numero };
            const datos = await escalarRecetaProducto(productoId, payload);
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
            cantidad: resultado.rendimiento_esperado,
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

    return (
        <section className={styles.formularioTarjeta} aria-labelledby="titulo-escalar-receta">
            <h3 id="titulo-escalar-receta" style={{ marginTop: 0 }}>
                Escalar receta
            </h3>
            <p className={styles.textMuted} style={{ fontSize: '0.9rem'}}>
                Calculá las cantidades exactas de ingredientes según la producción de hoy. No modifica la receta original.
            </p>

            <form
                onSubmit={handleCalcular}
                style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end'}}
            >
                <div className={styles.formGroup} style={{ minWidth: '180px' }}>
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
                    </select>
                </div>

                <div className={styles.formGroup} style={{ minWidth: '180px '}}>
                    <label htmlFor="valor-escalado">
                        {modo === 'factor' ? 'Factor (ej: 1.5, 2):' : 'Cantidad objetivo (g)'}
                    </label>
                    <input
                        id="valor-escalado"
                        type="number"
                        min="0"
                        step="any"
                        placeholder={modo === 'factor' ? 'Ej: 2' : 'Ej: 2500'}
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
                <p role="alert" style={{ color: '#ef4444', marginTop: '12px' }}>
                    {error}
                </p>
            )}

            {resultado && (
                <div style={{ marginTop: '20px' }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '10px',
                            padding: '10px 14px',
                            backgroundColor: '#f8fafc',
                            borderRadius: '6px',
                            marginBottom: '14px',
                            fontSize: '0.9rem',
                        }}
                    >
                        <span>
                            <strong>Rendimiento base:</strong> {resultado.rendimiento_original}{' '}
                            {resultado.unidad_producto_nombre}
                        </span>
                        <span>
                            <strong>Rendimiento esperado:</strong> {resultado.rendimiento_esperado}{' '}
                            {resultado.unidad_producto_nombre}
                        </span>
                        <span>
                            <strong>Factor aplicado:</strong> x{resultado.factor_aplicado}
                        </span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table
                            style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                textAlign: 'left',
                                fontSize: '0.9rem'
                            }}
                        >
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                    <th style={{ padding: '8px' }}>Insumo</th>
                                    <th style={{ padding: '8px' }}>Original</th>
                                    <th style={{ padding: '8px' }}>Escalado</th>
                                    <th style={{ padding: '8px' }}>Stock disponible</th>
                                    <th style={{ padding: '8px' }}>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {resultado.renglones.map((renglon) => (
                                    <tr
                                        key={renglon.insumo_id}
                                        style={{
                                            borderBottom: '1px solid #e2e8f0',
                                            backgroundColor: renglon.stock_suficiente
                                                ? 'transparent'
                                                : '#fef2f2',
                                        }}
                                    >
                                        <td style={{ padding: '8px', fontWeight: 500 }}>
                                            {renglon.insumo_nombre}
                                        </td>
                                        <td style={{ padding: '8px' }}>
                                            {renglon.cantidad_original} {renglon.unidad_medida_nombre}
                                        </td>
                                        <td style={{ padding: '8px', fontWeight: 600 }}>
                                            {renglon.cantidad_escalada} {renglon.unidad_medida_nombre}
                                        </td>
                                        <td style={{ padding: '8px' }}>
                                            {formatearStock(renglon.stock_disponible, renglon.magnitud)}
                                        </td>
                                        <td style={{ padding: '8px' }}>
                                            {renglon.stock_suficiente ? (
                                                <span style={{ color: '#16a34a', fontWeight: 500 }}>
                                                    Disponible
                                                </span>
                                            ) : (
                                                <span style={{ color: '#dc2626', fontWeight: 600 }}>
                                                    Stock insuficiente
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {hayFaltanteStock && (
                        <p style={{ color: '#b45309', fontSize: '0.85rem', marginTop: '10px' }}>
                            Algunos insumos no tienen stock suficiente. Podés iniciar el lote igualmente y ajustar las cantidades en el formulario.
                        </p>
                    )}

                    <div className={styles.filaBotones} style={{ marginTop: '16px' }}>
                        <Boton variant="crear" onClick={handleIniciarLote}>
                            Iniciar lote con estas cantidades
                        </Boton>
                    </div>
                </div>
            )}
        </section>
    );
}