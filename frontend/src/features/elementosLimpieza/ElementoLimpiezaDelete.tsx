import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type { ElementoLimpieza } from '../../types/elementosLimpieza';
import { getElementoLimpiezaById, deleteElementoLimpieza } from '../../services/elementosLimpiezaServices';
import Boton from '../../components/Boton';
import ModalAlerta from '../../components/alerta';
import styles from '../../styles/shared.module.css';

export default function ElementoLimpiezaDelete() {
    const [elemento, setElemento] = useState<ElementoLimpieza | null>(null);
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const cargarElemento = async () => {
            if (id) {
                try {
                    const data = await getElementoLimpiezaById(id);
                    setElemento(data);
                } catch (error) {
                    console.error("Error al cargar el elemento de limpieza:", error);
                }
            }
        };
        cargarElemento();
    }, [id]);

    const handleDelete = async () => {
        if (!id) return;

        try {
            const exito = await deleteElementoLimpieza(id);
            if (exito) {
                navigate('/elementosLimpieza');
            } else {
                setModalAlerta({
                    isOpen: true,
                    titulo: 'Error al Eliminar',
                    mensaje: 'Hubo un error al intentar eliminar el registro.'
                });
            }
        } catch (error) {
            console.error('Error de red:', error);
            setModalAlerta({
                isOpen: true,
                titulo: 'Error de Red',
                mensaje: 'No se pudo conectar con el servidor.'
            });
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>¿Desea eliminar este elemento de limpieza?</h2>
            {elemento ? (
                <div className={styles.tarjetaEstatica} style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
                    <h3 style={{ color: 'var(--text-h)' }}>{elemento.nombre}</h3>
                    <p>
                        {elemento.frecuencia_recambio_dias !== null
                            ? `Recambio cada ${elemento.frecuencia_recambio_dias} días`
                            : 'Sin frecuencia de recambio definida'}
                    </p>

                    <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                        <Link to="/elementosLimpieza">
                            <Boton variant="volver">
                                Cancelar
                            </Boton>
                        </Link>
                        <Boton variant="eliminar" onClick={handleDelete}>
                            Eliminar
                        </Boton>
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
