import type { MagnitudUnidad } from '../../types/unidadesMedida';
import Boton from '../../components/Boton';
import { formatearStock } from '../insumos/cantidades';
import estilos from './InsumosLote.module.css';

export interface ItemInsumoLote {
    insumoId: number;
    nombre: string;
    cantidadBase: number;
    magnitud: MagnitudUnidad;
}

interface ListaInsumosLoteProps {
    items: ItemInsumoLote[];
    mensajeVacio: string;
    onQuitar?: (insumoId: number) => void;
}

export default function ListaInsumosLote({ items, mensajeVacio, onQuitar }: ListaInsumosLoteProps) {
    if (items.length === 0) return <p className={estilos.vacio}>{mensajeVacio}</p>;

    return (
        <ul className={estilos.lista}>
            {items.map((item) => (
                <li key={item.insumoId} className={estilos.item}>
                    <span>
                        <strong>{item.nombre}</strong>: {formatearStock(item.cantidadBase, item.magnitud)}
                    </span>
                    {onQuitar && (
                        <Boton variant="eliminar" title={`Quitar ${item.nombre}`} onClick={() => onQuitar(item.insumoId)} />
                    )}
                </li>
            ))}
        </ul>
    );
}
