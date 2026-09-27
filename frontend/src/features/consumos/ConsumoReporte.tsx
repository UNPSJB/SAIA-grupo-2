import { useState, useEffect } from "react";
import type { ConsumoAcumulado, ConsumoDetallado } from '../../types/consumos';
import { getReporteConsumos } from '../../services/consumosServices';
import styles from '../../styles/shared.module.css';

export default function ConsumoReporte() {
    const [reporte, setReporte] = useState<any[]>([]);
    
    const [acumulado, setAcumulado] = useState<boolean>(true);
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFin, setFechaFin] = useState<string>('');

useEffect(() => {
        setReporte([]); 
        getReporteConsumos(acumulado, fechaInicio, fechaFin).then(setReporte);
    }, [acumulado, fechaInicio, fechaFin]);
    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Reporte de Consumos</h2>
            
            {/* Controles de Filtros */}
            <div className={styles.formularioTarjeta} style={{ marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className={styles.formGroup} style={{ flex: 1, minWidth: '200px' }}>
                    <label>Tipo de Reporte:</label>
                    <select value={acumulado ? 'true' : 'false'} 
                        onChange={(e) => {
                            setAcumulado(e.target.value === 'true');
                            setReporte([]); // <-- Vaciamos la tabla al instante
                        }}
                    >
                        <option value="true">Totales Acumulados</option>
                        <option value="false">Historial Detallado</option>
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label>Desde:</label>
                    <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                    <label>Hasta:</label>
                    <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                </div>
            </div>

            {/* Contenedor dinámico de la tabla */}
            <div className={styles.contenedorTabla} style={{ maxWidth: acumulado ? '800px' : '100%' }}>
                {acumulado ? (
                    // VISTA ACUMULADA
                    <>
                        <div className={styles.filaHeader} style={{ gridTemplateColumns: '3fr 2fr' }}>
                            <div>Producto Químico / Insumo</div>
                            <div>Consumo Total</div>
                        </div>
                        {reporte.map((item: ConsumoAcumulado) => (
                            <div key={item.producto_limpieza_id} className={styles.filaItem} style={{ gridTemplateColumns: '3fr 2fr' }}>
                                <div style={{ fontWeight: '500', color: 'var(--text-h)' }}>{item.nombre_producto}</div>
                                <div>
                                    <span className={styles.badge}>
                                        {item.cantidad_total.toFixed(2)} {item.unidad_medida}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </>
                ) : (
                    // VISTA DETALLADA
                    <>
                        <div className={styles.filaHeader} style={{ gridTemplateColumns: '1.5fr 2fr 3fr 1.5fr' }}>
                            <div>Fecha</div>
                            <div>Producto</div>
                            <div>Tarea Asociada</div>
                            <div>Cantidad</div>
                        </div>
                        {reporte.map((item: ConsumoDetallado) => (
                            <div key={item.id} className={styles.filaItem} style={{ gridTemplateColumns: '1.5fr 2fr 3fr 1.5fr' }}>
                                <div>{item.fecha_registro}</div>
                                <div style={{ fontWeight: '500', color: 'var(--text-h)' }}>{item.nombre_producto}</div>
                                <div>{item.titulo_tarea}</div>
                                <div>
                                    <span className={styles.badge}>
                                        {(item.cantidad_consumida || 0).toFixed(2)} {item.unidad_medida}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </>
                )}
                
                {reporte.length === 0 && (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text)' }}>
                        No se encontraron registros de consumo con estos filtros.
                    </div>
                )}
            </div>
        </div>
    );
}