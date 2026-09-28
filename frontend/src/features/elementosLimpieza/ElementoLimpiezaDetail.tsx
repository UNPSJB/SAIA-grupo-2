import { useState, useEffect } from "react";
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { ElementoLimpieza } from '../../types/elementosLimpieza';
import { getElementoLimpiezaById, registrarRecambio } from '../../services/elementosLimpiezaServices';
import { COLOR_ESTADO, ETIQUETA_ESTADO, textoRecambio } from './estadoRecambio';
import Boton from '../../components/Boton';
import ModalAlerta from '../../components/alerta';
import styles from '../../styles/shared.module.css';

export default function ElementoLimpiezaDetail() {
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === 'admin';

    const [elemento, setElemento] = useState<ElementoLimpieza | null>(null);
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });
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
            setModalAlerta({
                isOpen: true,
                titulo: 'Error',
                mensaje: 'Hubo un error al registrar el recambio.'
            });
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
                            style={{
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                color: COLOR_ESTADO[elemento.estado_recambio]
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
                        {esAdmin && elemento.frecuencia_recambio_dias !== null && (
                            <Boton variant="guardar" onClick={handleRecambio}>
                                Registrar recambio
                            </Boton>
                        )}
                        <Link to={esAdmin ? "/elementosLimpieza" : "/elementosLimpieza/alertas"}>
                            <Boton variant="volver">Volver</Boton>
                        </Link>
                    </div>
                </div>
            ) : (
                <p>Elemento de limpieza no encontrado</p>
            )}

            <ModalAlerta
                isOpen={modalAlerta.isOpen}
                titulo={modalAlerta.titulo}
                mensaje={modalAlerta.mensaje}
                onClose={() => setModalAlerta({ ...modalAlerta, isOpen: false })}
            />
        </div>
    );
}
