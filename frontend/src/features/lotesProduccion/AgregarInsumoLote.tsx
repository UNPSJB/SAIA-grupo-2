import { useState } from 'react';
import type { Insumo } from '../../types/insumos';
import type { UnidadMedida } from '../../types/unidadesMedida';
import Boton from '../../components/Boton';
import SearchableSelect from '../../components/SearchableSelect';
import CampoCantidad from '../insumos/CampoCantidad';
import { convertirABase, formatearStock, unidadBase, unidadesCompatibles } from '../insumos/cantidades';
import estilos from './InsumosLote.module.css';

export interface InsumoElegido {
    insumo: Insumo;
    cantidad: number;
    unidadMedidaId: number;
    cantidadBase: number;
}

interface AgregarInsumoLoteProps {
    insumos: Insumo[];
    unidades: UnidadMedida[];
    yaAgregados: number[];
    onAgregar: (elegido: InsumoElegido) => void;
}

export default function AgregarInsumoLote({ insumos, unidades, yaAgregados, onAgregar }: AgregarInsumoLoteProps) {
    const [insumoId, setInsumoId] = useState('');
    const [cantidad, setCantidad] = useState('');
    const [unidadId, setUnidadId] = useState('');
    const [error, setError] = useState('');

    const disponibles = insumos.filter((insumo) => !yaAgregados.includes(insumo.id));
    const insumo = insumos.find((item) => String(item.id) === insumoId);
    const opciones = insumo ? unidadesCompatibles(unidades, insumo.unidad_medida.magnitud) : [];

    const elegirInsumo = (valor: string) => {
        setInsumoId(valor);
        const elegido = insumos.find((item) => String(item.id) === valor);
        const base = elegido ? unidadBase(unidades, elegido.unidad_medida.magnitud) : undefined;
        setUnidadId(base ? String(base.id) : elegido ? String(elegido.unidad_medida_id) : '');
        setError('');
    };

    const agregar = () => {
        const unidad = opciones.find((item) => String(item.id) === unidadId);
        const valor = Number(cantidad);
        if (!insumo || !unidad) {
            setError('Elegí un insumo.');
            return;
        }
        if (cantidad === '' || !(valor > 0)) {
            setError('La cantidad debe ser mayor a 0.');
            return;
        }
        const cantidadBase = convertirABase(valor, unidad);
        if (cantidadBase > insumo.cantidad) {
            setError(`Solo hay ${formatearStock(insumo.cantidad, insumo.unidad_medida.magnitud)} en stock.`);
            return;
        }
        onAgregar({ insumo, cantidad: valor, unidadMedidaId: unidad.id, cantidadBase });
        setInsumoId('');
        setCantidad('');
        setUnidadId('');
        setError('');
    };

    return (
        <div className={estilos.agregar}>
            <div className={estilos.campoInsumo}>
                <label htmlFor="lote-insumo">Insumo</label>
                <SearchableSelect
                    id="lote-insumo"
                    options={disponibles}
                    getOptionValue={(item) => String(item.id)}
                    getOptionLabel={(item) => `${item.nombre} (${formatearStock(item.cantidad, item.unidad_medida.magnitud)} disponibles)`}
                    value={insumoId}
                    onChange={(val) => elegirInsumo(val ? String(val) : '')}
                    placeholder={disponibles.length === 0 ? 'No hay insumos para agregar' : 'Seleccione un insumo...'}
                />
            </div>
            <CampoCantidad
                id="lote-insumo-cantidad"
                etiqueta="Cantidad"
                cantidad={cantidad}
                unidadId={unidadId}
                unidades={opciones}
                onCambiarCantidad={(valor) => {
                    setCantidad(valor);
                    setError('');
                }}
                onCambiarUnidad={setUnidadId}
                error={error}
            />
            <div className={estilos.botonAgregar}>
                <Boton type="button" variant="crear" onClick={agregar}>
                    Agregar
                </Boton>
            </div>
        </div>
    );
}
