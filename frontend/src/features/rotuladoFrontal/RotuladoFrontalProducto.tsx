import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { EstadoRotuladoProducto } from '../../types/rotuladoFrontal';
import { getModuloRotuladoFrontal } from '../../services/parametrosNormativosServices';
import { getRotuladoProducto } from '../../services/rotuladoFrontalServices';
import Boton from '../../components/Boton';
import ResultadoRotulado from './ResultadoRotulado';
import estilos from './RotuladoFrontal.module.css';
import styles from '../../styles/shared.module.css';

interface RotuladoFrontalProductoProps {
    productoId: number;
}

interface Respuesta {
    clave: number;
    estado: EstadoRotuladoProducto | null;
}

export default function RotuladoFrontalProducto({ productoId }: RotuladoFrontalProductoProps) {
    const [respuesta, setRespuesta] = useState<Respuesta | null>(null);

    useEffect(() => {
        let cancelado = false;

        getModuloRotuladoFrontal()
            .then((modulo) => (modulo.activo ? getRotuladoProducto(productoId) : null))
            .then((estado) => {
                if (!cancelado) setRespuesta({ clave: productoId, estado });
            })
            .catch((problema) => {
                console.error('Error al cargar el rotulado frontal del producto:', problema);
                if (!cancelado) setRespuesta({ clave: productoId, estado: null });
            });

        return () => {
            cancelado = true;
        };
    }, [productoId]);

    const estado = respuesta?.clave === productoId ? respuesta.estado : null;
    if (estado === null) return null;

    return (
        <div className={estilos.seccionProducto}>
            <div className={estilos.seccionProductoEncabezado}>
                <strong>Rotulado frontal</strong>
                <Link to={`/rotulado-frontal/${productoId}`}>
                    <Boton variant={estado.evaluacion ? 'editar' : 'crear'}>
                        {estado.evaluacion ? 'Revisar' : 'Evaluar'}
                    </Boton>
                </Link>
            </div>
            {estado.evaluacion ? (
                <ResultadoRotulado evaluacion={estado.evaluacion} />
            ) : (
                <p className={styles.textMuted}>Todavía no se evaluó si le corresponde rotulado frontal.</p>
            )}
        </div>
    );
}
