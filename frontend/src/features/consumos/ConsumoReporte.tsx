import { useState, useEffect } from "react";
import type { ConsumoAcumulado } from '../../types/consumos';
import { getConsumoAcumulado } from '../../services/consumosServices';
import styles from '../../styles/shared.module.css';

export default function ConsumoReporte() {
    const [reporte, setReporte] = useState<ConsumoAcumulado[]>([]);

    useEffect(() => {
        getConsumoAcumulado().then(setReporte);
    }, []);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Reporte de Consumo Acumulado</h2>
            <div className={styles.contenedorTabla} style={{ maxWidth: '800px' }}>
                <div className={styles.filaHeader} style={{ gridTemplateColumns: '3fr 2fr' }}>
                    <div>Producto Químico / Insumo</div>
                    <div>Consumo Total Histórico</div>
                </div>

                {reporte.map((item) => (
                    <div key={item.insumo_id} className={styles.filaItem} style={{ gridTemplateColumns: '3fr 2fr' }}>
                        <div style={{ fontWeight: '500', color: 'var(--text-h)' }}>
                            {item.nombre_insumo}
                        </div>
                        <div>
                            <span className={styles.badge}>
                                {item.cantidad_total.toFixed(2)} {item.unidad_medida}
                            </span>
                        </div>
                    </div>
                ))}
                
                {reporte.length === 0 && (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text)' }}>
                        No hay consumos registrados aún.
                    </div>
                )}
            </div>
        </div>
    );
}