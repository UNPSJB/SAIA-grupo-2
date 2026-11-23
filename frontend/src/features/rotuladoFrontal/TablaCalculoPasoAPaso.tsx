import type { PasoCalculoNutriente } from '../../types/rotuladoFrontal';
import { ETIQUETA_SELLO_CORTA } from '../parametrosNormativos/etiquetas';
import styles from '../../styles/shared.module.css';

interface Props {
    pasos: PasoCalculoNutriente[];
}

export default function TablaCalculoPasoAPaso({ pasos }: Props) {
    if (!pasos || pasos.length === 0) {
        return (
            <p className={styles.textMuted} style={{ fontStyle: 'italic', margin: '0.5rem 0' }}>
                No hay pasos de cálculo registrados para esta evaluación.
            </p>
        );
    }

    return (
        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table
                style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.88rem',
                    textAlign: 'left',
                }}
            >
                <thead>
                    <tr
                        style={{
                            borderBottom: '2px solid var(--border-color, #334155)',
                            color: 'var(--text-h, #f8fafc)',
                        }}
                    >
                        <th style={{ padding: '10px 12px' }}>Nutriente / Sello</th>
                        <th style={{ padding: '10px 12px' }}>Condición de Evaluación</th>
                        <th style={{ padding: '10px 12px' }}>Fórmula Explicativa Paso a Paso</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Resultado</th>
                    </tr>
                </thead>
                <tbody>
                    {pasos.map((p, idx) => {
                        let etiquetaNutriente = ETIQUETA_SELLO_CORTA[p.sello] || p.nutriente;
                        if (p.sello === 'exceso_sodio') {
                            etiquetaNutriente = p.forma_evaluacion === 'mg_por_kcal'
                                ? 'Sodio (mg / kcal)'
                                : 'Sodio (mg / 100g)';
                        }

                        const formulaLimpia = p.formula_desplegada.replace(/cada 100 g cada 100 g\/ml/g, 'cada 100 g');

                        return (
                            <tr
                                key={`${p.sello}-${idx}`}
                                style={{
                                    borderBottom: '1px solid var(--border-color, #1e293b)',
                                }}
                            >
                                <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-h)' }}>
                                    {etiquetaNutriente}
                                </td>
                                <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                                    {p.evaluado ? (
                                        <span style={{ color: '#38bdf8', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                            ✓ Aplica evaluación
                                        </span>
                                    ) : (
                                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                                            {p.motivo_no_evaluado || 'Omitido'}
                                        </span>
                                    )}
                                </td>
                                <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                                    {p.evaluado ? (
                                        <div style={{ color: 'var(--text-h)' }}>
                                            {formulaLimpia}
                                        </div>
                                    ) : (
                                        <span style={{ color: '#64748b' }}>—</span>
                                    )}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                    {!p.evaluado ? (
                                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                                            Omitido
                                        </span>
                                    ) : p.supera_umbral ? (
                                        <span style={{ color: '#ef4444', fontWeight: 700 }}>
                                            ⚠ Supera umbral
                                        </span>
                                    ) : (
                                        <span style={{ color: '#22c55e', fontWeight: 600 }}>
                                            ✓ Cumple norma
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
