import { useEffect, useState } from 'react';
import type { DetalleReceta } from '../../types/receta';
import type { DatosNutricionalesInsumo } from '../../types/datosNutricionales';
import { getDatosNutricionales } from '../../services/datosNutricionalesServices';
import styles from '../../styles/shared.module.css';

interface Props {
    detalles: DetalleReceta[];
    rendimientoGramos: number;
}

interface AporteInsumo {
    insumoId: number;
    insumoNombre: string;
    cantidadGramos: number;
    porcentajeReceta: number;
    energiaKcal: number | null;
    sodioMg: number | null;
    azucaresG: number | null;
    grasasG: number | null;
    proteinasG: number | null;
    carbohidratosG: number | null;
    incompleto: boolean;
}

export default function TablaAporteNutricionalInsumos({ detalles, rendimientoGramos }: Props) {
    const [aportes, setAportes] = useState<AporteInsumo[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let cancelado = false;

        const calcularAportes = async () => {
            setLoading(true);
            try {
                const totalMasa = detalles.reduce((sum, d) => sum + d.cantidad_gramos, 0) || rendimientoGramos || 1;

                const resultados = await Promise.all(
                    detalles.map(async (det) => {
                        try {
                            const resNut: DatosNutricionalesInsumo = await getDatosNutricionales(det.insumo_id);
                            const mapaNutrientes = new Map<string, number>();
                            resNut.datos.forEach((d) => {
                                if (d.valor !== null && d.valor !== undefined) {
                                    mapaNutrientes.set(d.nutriente, d.valor);
                                }
                            });

                            const factorGramos = det.cantidad_gramos / 100;

                            const valEnergia = mapaNutrientes.get('energia');
                            const valSodio = mapaNutrientes.get('sodio');
                            const valAzucares = mapaNutrientes.get('azucares_totales');
                            const valGrasas = mapaNutrientes.get('grasas_totales');
                            const valProteinas = mapaNutrientes.get('proteinas');
                            const valCarbohidratos = mapaNutrientes.get('carbohidratos');

                            const incompleto = [valEnergia, valSodio, valAzucares, valGrasas, valProteinas].some(
                                (v) => v === undefined || v === null
                            );

                            return {
                                insumoId: det.insumo_id,
                                insumoNombre: resNut.insumo.nombre || `Insumo #${det.insumo_id}`,
                                cantidadGramos: det.cantidad_gramos,
                                porcentajeReceta: (det.cantidad_gramos / totalMasa) * 100,
                                energiaKcal: valEnergia !== undefined ? valEnergia * factorGramos : null,
                                sodioMg: valSodio !== undefined ? valSodio * factorGramos : null,
                                azucaresG: valAzucares !== undefined ? valAzucares * factorGramos : null,
                                grasasG: valGrasas !== undefined ? valGrasas * factorGramos : null,
                                proteinasG: valProteinas !== undefined ? valProteinas * factorGramos : null,
                                carbohidratosG: valCarbohidratos !== undefined ? valCarbohidratos * factorGramos : null,
                                incompleto,
                            };
                        } catch (err) {
                            console.error(`Error al cargar datos nutricionales de insumo ${det.insumo_id}:`, err);
                            return {
                                insumoId: det.insumo_id,
                                insumoNombre: `Insumo #${det.insumo_id}`,
                                cantidadGramos: det.cantidad_gramos,
                                porcentajeReceta: (det.cantidad_gramos / totalMasa) * 100,
                                energiaKcal: null,
                                sodioMg: null,
                                azucaresG: null,
                                grasasG: null,
                                proteinasG: null,
                                carbohidratosG: null,
                                incompleto: true,
                            };
                        }
                    })
                );

                if (!cancelado) {
                    setAportes(resultados);
                }
            } catch (err) {
                console.error("Error al calcular desgloses de aporte nutricional:", err);
            } finally {
                if (!cancelado) {
                    setLoading(false);
                }
            }
        };

        if (detalles.length > 0) {
            calcularAportes();
        } else {
            setAportes([]);
            setLoading(false);
        }

        return () => {
            cancelado = true;
        };
    }, [detalles, rendimientoGramos]);

    if (loading) {
        return <p className={styles.textMuted}>Calculando desglose de aporte nutricional por ingrediente...</p>;
    }

    if (detalles.length === 0) {
        return <p className={styles.textMuted}>No hay ingredientes ni aditivos en esta versión de receta.</p>;
    }

    const sumaEnergia = aportes.reduce((sum, a) => sum + (a.energiaKcal || 0), 0);
    const sumaSodio = aportes.reduce((sum, a) => sum + (a.sodioMg || 0), 0);
    const sumaAzucares = aportes.reduce((sum, a) => sum + (a.azucaresG || 0), 0);
    const sumaGrasas = aportes.reduce((sum, a) => sum + (a.grasasG || 0), 0);
    const sumaProteinas = aportes.reduce((sum, a) => sum + (a.proteinasG || 0), 0);
    const sumaGramos = aportes.reduce((sum, a) => sum + a.cantidadGramos, 0);

    const hayIncompletos = aportes.some((a) => a.incompleto);

    return (
        <section className={styles.bloqueDetalle} aria-label="Desglose de Aporte Nutricional por Insumo">
            <h3>Aporte Nutricional por Ingrediente</h3>
            <p className={styles.textMuted} style={{ fontSize: '0.88rem', marginBottom: '1rem' }}>
                Aporte estimado de cada ingrediente a la masa total del batch de receta.
            </p>

            {hayIncompletos && (
                <div style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    <strong>⚠ Insumos con datos incompletos:</strong> Algunos ingredientes señalados con (*) no poseen todos sus valores nutricionales cargados en el sistema.
                </div>
            )}

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-h)' }}>
                            <th style={{ padding: '10px' }}>Ingrediente</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>Cantidad (g)</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>% Receta</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>Energía (kcal)</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>Sodio (mg)</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>Azúcares (g)</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>Grasas (g)</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>Proteínas (g)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {aportes.map((a) => (
                            <tr key={a.insumoId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-h)' }}>
                                    {a.insumoNombre} {a.incompleto && <span style={{ color: '#eab308' }}>*</span>}
                                </td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>{a.cantidadGramos.toFixed(1)} g</td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>{a.porcentajeReceta.toFixed(2)} %</td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>
                                    {a.energiaKcal !== null ? `${a.energiaKcal.toFixed(1)} kcal` : '—'}
                                </td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>
                                    {a.sodioMg !== null ? `${a.sodioMg.toFixed(1)} mg` : '—'}
                                </td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>
                                    {a.azucaresG !== null ? `${a.azucaresG.toFixed(1)} g` : '—'}
                                </td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>
                                    {a.grasasG !== null ? `${a.grasasG.toFixed(1)} g` : '—'}
                                </td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>
                                    {a.proteinasG !== null ? `${a.proteinasG.toFixed(1)} g` : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ borderTop: '2px solid var(--border-color)', fontWeight: 700, color: 'var(--text-h)', backgroundColor: 'var(--input-bg)' }}>
                            <td style={{ padding: '10px' }}>TOTAL BATCH RECETA</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{sumaGramos.toFixed(1)} g</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>100.00 %</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{sumaEnergia.toFixed(1)} kcal</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{sumaSodio.toFixed(1)} mg</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{sumaAzucares.toFixed(1)} g</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{sumaGrasas.toFixed(1)} g</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{sumaProteinas.toFixed(1)} g</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </section>
    );
}
