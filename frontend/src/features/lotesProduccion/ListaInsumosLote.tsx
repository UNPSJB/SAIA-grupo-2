import type { MagnitudUnidad } from '../../types/unidadesMedida';
import Boton from '../../components/Boton';
import { formatearStock } from '../insumos/cantidades';
import estilos from './InsumosLote.module.css';

export interface ItemInsumoLote {
    insumoId: number;
    nombre: string;
    cantidadBase: number;
    magnitud: MagnitudUnidad;
    editable?: boolean;
    cantidad?: number;
    cantidadReceta?: number;
    unidadNombre?: string;
    stockDisponibleBase?: number;
}

interface ListaInsumosLoteProps {
    items: ItemInsumoLote[];
    mensajeVacio: string;
    onCambiarCantidad?: (insumoId: number, nuevaCantidad: number) => void;
    onQuitar?: (insumoId: number) => void;
}

export default function ListaInsumosLote({ items, mensajeVacio, onCambiarCantidad, onQuitar }: ListaInsumosLoteProps) {
    if (items.length === 0) return <p className={estilos.vacio}>{mensajeVacio}</p>;

    return (
        <ul className={estilos.lista}>
            {items.map((item) => {
                const difiereReceta = 
                    item.cantidadReceta !== undefined &&
                    item.cantidad != undefined &&
                    Math.abs(item.cantidad - item.cantidadReceta) > 0.0001;

                const superaStock =
                    item.stockDisponibleBase != undefined && item.cantidadBase > item.stockDisponibleBase;

                if (item.editable && onCambiarCantidad) {
                    return (
                        <li key={item.insumoId} className={`${estilos.item} ${estilos.itemPrecargado}`}>
                            <div className={estilos.infoInsumo}>
                                <strong>{item.nombre}</strong>
                                {difiereReceta && (
                                    <span className={estilos.avisoDiferencia} role="status">
                                        Difiere de la receta. Escalado: {item.cantidadReceta} {item.unidadNombre}
                                    </span>
                                )}
                                {superaStock && (
                                    <span className={estilos.errorRenglon}>
                                        Supera el stock disponible ({formatearStock(item.stockDisponibleBase!, item.magnitud)})
                                    </span>
                                )}
                            </div>

                            <div className={estilos.cantidadEditable}>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    aria-label={`Cantidad de ${item.nombre}`}
                                    value={item.cantidad ?? ''}
                                    onChange={(e) => onCambiarCantidad(item.insumoId, Number(e.target.value))}
                                />
                                <span className={estilos.unidadFija}>{item.unidadNombre}</span>
                            </div>

                            {onQuitar && (
                                <Boton
                                    variant="eliminar"
                                    title={`Quitar ${item.nombre}`}
                                    onClick={() => onQuitar(item.insumoId)}
                                />
                            )}
                        </li>
                    );
                }

                return (
                    <li key={item.insumoId} className={estilos.item}>
                        <span>
                            <strong>{item.nombre}</strong>: {formatearStock(item.cantidadBase, item.magnitud)}
                        </span>
                        {onQuitar && (
                            <Boton variant="eliminar" title={`Quitar ${item.nombre}`} onClick={() => onQuitar(item.insumoId)} />
                        )}
                    </li>
                );
            })}                
        </ul>
    );
}
