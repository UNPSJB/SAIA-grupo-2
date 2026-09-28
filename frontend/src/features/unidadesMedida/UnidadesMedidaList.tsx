import { useState, useEffect } from "react";
import type { UnidadMedida } from '../../types/unidadesMedida';
import { getUnidadesMedida } from '../../services/unidadesMedidaServices';
import styles from '../../styles/shared.module.css';

export default function UnidadesMedidaList() {
    const [unidadesMedida, setUnidadesMedida] = useState<UnidadMedida[]>([]);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const data = await getUnidadesMedida();
                setUnidadesMedida(data);
            } catch (error) {
                console.error("Error al cargar unidades de medida:", error);
            }
        };
        
        cargarDatos();
    }, []);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Unidades de Medida</h2>

            <div className={styles.contenedorTabla} style={{ maxWidth: '600px' }}>
                <div className={styles.filaHeader} style={{ gridTemplateColumns: '1fr 3fr' }}>
                    <div>ID</div>
                    <div>Nombre de la Unidad</div>
                </div>

                {unidadesMedida.map((unidad) => (
                    <div key={unidad.id} className={styles.filaItem} style={{ gridTemplateColumns: '1fr 3fr' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>#{unidad.id}</div>
                        <div style={{ fontWeight: '500', color: 'var(--text-h)' }}>{unidad.nombre}</div>
                    </div>
                ))}

                {unidadesMedida.length === 0 && (
                    <div className={styles.emptyMensaje}>
                        No hay unidades de medida registradas.
                    </div>
                )}
            </div>
        </div>
    );
}
