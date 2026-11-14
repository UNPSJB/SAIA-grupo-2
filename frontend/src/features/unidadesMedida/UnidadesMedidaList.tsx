import { useState, useEffect } from "react";
import type { MagnitudUnidad, UnidadMedida } from '../../types/unidadesMedida';
import { getUnidadesMedida } from '../../services/unidadesMedidaServices';
import styles from '../../styles/shared.module.css';

import BuscadorTexto from '../../components/BuscadorTexto';
import { filtrarPorTexto } from '../../utils/texto';

import TablaPaginada, {type Columna } from '../../components/TablaPaginada';
import EncabezadoPagina from '../../components/EncabezadoPagina';

const ETIQUETA_MAGNITUD: Record<MagnitudUnidad, string> = {
    masa: 'Masa',
    volumen: 'Volumen',
    cantidad: 'Cantidad',
};

const UNIDAD_BASE: Record<MagnitudUnidad, string> = {
    masa: 'g',
    volumen: 'ml',
    cantidad: 'unidades',
};

function equivalencia(unidad: UnidadMedida): string {
    const factor = unidad.factor_base.toLocaleString('es-AR');
    return `${factor} ${UNIDAD_BASE[unidad.magnitud]}`;
}

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
        },
        {
            key:'magnitud',
            encabezado:'Magnitud',
            ordenable: true,
            render: (unidad) => ETIQUETA_MAGNITUD[unidad.magnitud]
        },
        {
            key:'factor_base',
            encabezado:'Equivale a',
            ordenable: false,
            render: (unidad) => equivalencia(unidad)
        }
    ]



    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Unidades de Medida"
                descripcion="Catálogo fijo de unidades. Las cantidades de insumos se convierten a gramos o mililitros."
            />


            <div className={styles.filaBotonesSuperiores}>
                <BuscadorTexto valor={busqueda} onCambio={setBusqueda} placeholder="Buscar unidad..." />
            </div>


            <div style={{ maxWidth: '1100px', width: '100%' }}>
                 <TablaPaginada
                     datos={unidadesFiltradas}
                     columnas={misColumnas}
                     gridTemplateColumns="0.5fr 1.5fr 1fr 1fr"
                     itemsPorPagina={5}
                     mensajeVacio="No se encontraron unidades de medida."
                     columnaOrdenInicial="id" 
                     ordenAscInicial={true}
                 />
            </div>


        </div>
    );
}
