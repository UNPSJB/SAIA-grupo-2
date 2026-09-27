import { useState, useEffect } from "react";
import { Link, useParams } from 'react-router-dom';
import type { ElementoLimpieza } from '../../types/elementosLimpieza';
import { getElementoLimpiezaById, registrarRecambio } from '../../services/elementosLimpiezaServices';
import { COLOR_ESTADO, ETIQUETA_ESTADO, textoRecambio } from './estadoRecambio';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function ElementoLimpiezaDetail() {
    const [elemento, setElemento] = useState<ElementoLimpieza | null>(null);
    const { id } = useParams();

    const cargarElemento = async () => {
        if (!id) return;
        try {
            const data = await getElementoLimpiezaById(id);
            setElemento(data);
        } catch (error) {
            console.error("Error al cargar el elemento de limpieza:", error);
        }
    };

    useEffect(() => {
        cargarElemento();
    }, [id]);

    const handleRecambio = async () => {
        if (!id) return;
        const exito = await registrarRecambio(id);
        if (exito) {
            cargarElemento();
        } else {
            alert('Hubo un error al registrar el recambio.');
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Detalle del Elemento de Limpieza</h2>
            {elemento ? (
                <div className={styles.tarjetaEstatica} style={{ maxWidth: '600px', width: '100%' }}>
                    <p><strong>Nombre:</strong> {elemento.nombre}</p>

                    <p>
                        <strong>Estado:</strong>{' '}
                        <span
                            className={styles.badge}
                            style={{
                                fontSize: '0.75rem',
                                padding: '3px 10px',
                                backgroundColor: COLOR_ESTADO[elemento.estado_recambio],
                                color: '#ffffff'
                            }}
                        >
                            {ETIQUETA_ESTADO[elemento.estado_recambio]}
                        </span>
                    </p>

                    <p>
                        <strong>Frecuencia de recambio:</strong>{' '}
                        {elemento.frecuencia_recambio_dias !== null
                            ? `Cada ${elemento.frecuencia_recambio_dias} días`
                            : 'No definida'}
                    </p>

                    <p><strong>Último recambio:</strong> {elemento.fecha_ultimo_recambio}</p>

                    <p>
                        <strong>Próximo recambio:</strong>{' '}
                        {elemento.fecha_proximo_recambio ?? 'No aplica'}
                        {elemento.fecha_proximo_recambio && ` (${textoRecambio(elemento)})`}
                    </p>

                    <div className={styles.filaBotones} style={{ marginTop: '20px', justifyContent: 'center' }}>
                        {elemento.frecuencia_recambio_dias !== null && (
                            <Boton variant="guardar" onClick={handleRecambio}>
                                Registrar recambio
                            </Boton>
                        )}
                        <Link to="/elementosLimpieza">
                            <Boton variant="volver">Volver a la lista</Boton>
                        </Link>
                    </div>
                </div>
            ) : (
                <p>Elemento de limpieza no encontrado</p>
            )}
        </div>
    );
}
