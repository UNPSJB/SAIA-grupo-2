import { useState, useEffect } from "react";
import { Link, useParams } from 'react-router-dom';
import type { Insumo } from '../../types/insumos';
import { getInsumoById } from '../../services/insumosServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import { useAuth } from '../../context/AuthContext';
import { formatearStock } from './cantidades';

export default function InsumoDetail() {
    const [insumo, setInsumo] = useState<Insumo | null>(null);
    const { usuario } = useAuth();
    const { id } = useParams();

    useEffect(() => {
        const cargarInsumo = async () => {
            if (id) {
                try {
                    const data = await getInsumoById(id);
                    setInsumo(data);
                } catch (error) {
                    console.error("Error al cargar Insumo:", error);
                }
            }
        };
        cargarInsumo();
    }, [id]);

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina titulo="Detalle del Insumo" ancho="600px" />
            {insumo ? (
                <div className={styles.tarjetaEstatica} style={{ maxWidth: '600px', width: '100%' }}>
                    <p><strong>Nombre:</strong> {insumo.nombre}</p>
                    <p><strong>Unidad de Medida:</strong> {insumo.unidad_medida.nombre}</p>
                    <p><strong>Stock disponible:</strong> {formatearStock(insumo.cantidad, insumo.unidad_medida.magnitud)}</p>

                    <div className={styles.bloqueDetalle} style={{ textAlign: 'center', marginTop: '20px' }}>
                        <Link to="/insumos">
                            <Boton variant="volver">Volver a la lista</Boton>
                        </Link>
                        {usuario?.rol === 'admin' && (
                            <Link to={`/datos-nutricionales/${insumo.id}`}>
                                <Boton variant="ver">Datos nutricionales</Boton>
                            </Link>
                        )}
                    </div>
                </div>
            ) : (
                <p>Insumo no encontrado</p>
            )}
        </div>
    );
}