import { useState, useEffect } from "react";
import type { UnidadMedida } from '../../types/unidadesMedida';
import { getUnidadesMedida } from '../../services/unidadesMedidaServices';
import styles from '../../styles/shared.module.css';

import BuscadorTexto from '../../components/BuscadorTexto';
import { filtrarPorTexto } from '../../utils/texto';

import TablaPaginada, {type Columna } from '../../components/TablaPaginada';

export default function UnidadesMedidaList() {
    const [unidadesMedida, setUnidadesMedida] = useState<UnidadMedida[]>([]);

    const [busqueda, setBusqueda] = useState('');
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
    const unidadesFiltradas = filtrarPorTexto(unidadesMedida, busqueda, (c) => [c.nombre]);

    const misColumnas:Columna<UnidadMedida>[]=[
        {
            key:'id',
            encabezado:'ID',
            ordenable: true,
            variant: 'badge',
            render: (unidad) => unidad.id
        },
        {
            key:'nombre',
            encabezado:'Nombre de la Unidad',
            ordenable: true,
            variant: 'titulo',
            render: (unidad) => unidad.nombre
        }



    ]



    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Unidades de Medida</h2>


            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: '1100px', marginBottom: '16px' }}>
                <BuscadorTexto valor={busqueda} onCambio={setBusqueda} placeholder="Buscar unidad..." />
            </div>


            <div style={{ maxWidth: '1100px', width: '100%' }}>
                 <TablaPaginada
                     datos={unidadesFiltradas}
                     columnas={misColumnas}
                     gridTemplateColumns="1.5fr 1fr "
                     itemsPorPagina={5}
                     mensajeVacio="No se encontraron unidades de medida."
                     columnaOrdenInicial="id" 
                     ordenAscInicial={true}
                 />
            </div>


        </div>
    );
}
