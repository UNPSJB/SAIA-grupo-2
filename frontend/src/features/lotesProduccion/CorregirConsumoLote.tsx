import { useEffect, useState } from 'react';
import type { InsumoAsociado, LoteProduccion } from '../../types/lotesProduccion';
import type { Insumo } from '../../types/insumos';
import type { MagnitudUnidad, UnidadMedida } from '../../types/unidadesMedida';
import { getInsumos } from '../../services/insumosServices';
import { getUnidadesMedida } from '../../services/unidadesMedidaServices';
import { corregirConsumoLote } from '../../services/lotesProduccionServices';
import Boton from '../../components/Boton';
import { formatearStock, simboloBase, unidadBase } from '../insumos/cantidades';
import AgregarInsumoLote from './AgregarInsumoLote';
import estilos from './InsumosLote.module.css';

interface Renglon {
    insumoId: number;
    nombre: string;
    magnitud: MagnitudUnidad;
    cantidad: string;
    declarado: number;
}

interface CorregirConsumoLoteProps {
    nroLote: number;
    consumo: InsumoAsociado[];
    onGuardado: (lote: LoteProduccion) => void;
    onCancelar: () => void;
}

export default function CorregirConsumoLote({ nroLote, consumo, onGuardado, onCancelar }: CorregirConsumoLoteProps) {
    const [renglones, setRenglones] = useState<Renglon[]>(() =>
        consumo.map((item) => ({
            insumoId: item.insumo_id,
            nombre: item.nombre,
            magnitud: item.magnitud,
            cantidad: String(item.cantidad_utilizada),
            declarado: item.cantidad_utilizada,
        })),
    );
    const [insumos, setInsumos] = useState<Insumo[]>([]);
    const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        let cancelado = false;
        Promise.all([getInsumos(), getUnidadesMedida()])
            .then(([datosInsumos, datosUnidades]) => {
                if (cancelado) return;
                setInsumos(datosInsumos.filter((insumo) => insumo.activo));
                setUnidades(datosUnidades);
            })
            .catch((problema) => console.error('Error al cargar los insumos:', problema));
        return () => {
            cancelado = true;
        };
    }, []);

    const disponible = (renglon: Renglon): number => {
        const stock = insumos.find((insumo) => insumo.id === renglon.insumoId)?.cantidad ?? 0;
        return stock + renglon.declarado;
    };

    const errorDe = (renglon: Renglon): string | null => {
        const valor = Number(renglon.cantidad);
        if (renglon.cantidad.trim() === '' || !(valor > 0)) return 'Debe ser mayor a 0';
        if (insumos.length > 0 && valor > disponible(renglon)) {
            return `Hay ${formatearStock(disponible(renglon), renglon.magnitud)} disponibles`;
        }
        return null;
    };

    const cambiar = (insumoId: number, cantidad: string) => {
        setRenglones((actuales) => actuales.map((r) => (r.insumoId === insumoId ? { ...r, cantidad } : r)));
        setError('');
    };

    const quitar = (insumoId: number) => {
        setRenglones((actuales) => actuales.filter((r) => r.insumoId !== insumoId));
        setError('');
    };

    const guardar = async () => {
        if (renglones.some((renglon) => errorDe(renglon) !== null)) {
            setError('Revisá las cantidades marcadas.');
            return;
        }
        const payload = renglones.map((renglon) => ({
            insumo_id: renglon.insumoId,
            cantidad_utilizada: Number(renglon.cantidad),
            unidad_medida_id: unidadBase(unidades, renglon.magnitud)?.id ?? 0,
        }));
        setGuardando(true);
        try {
            onGuardado(await corregirConsumoLote(nroLote, payload));
        } catch (problema) {
            setError(problema instanceof Error ? problema.message : 'No se pudo corregir el consumo.');
            setGuardando(false);
        }
    };

    return (
        <div className={estilos.correccion}>
            <ul className={estilos.lista}>
                {renglones.map((renglon) => {
                    const errorRenglon = errorDe(renglon);
                    const id = `consumo-${renglon.insumoId}`;
                    return (
                        <li key={renglon.insumoId} className={`${estilos.item} ${estilos.itemEditable}`}>
                            <label htmlFor={id}>{renglon.nombre}</label>
                            <div className={estilos.cantidadEditable}>
                                <input
                                    id={id}
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={renglon.cantidad}
                                    aria-invalid={Boolean(errorRenglon)}
                                    onChange={(e) => cambiar(renglon.insumoId, e.target.value)}
                                />
                                <span>{simboloBase(renglon.magnitud)}</span>
                            </div>
                            <Boton variant="eliminar" title={`Quitar ${renglon.nombre}`} onClick={() => quitar(renglon.insumoId)} />
                            {errorRenglon && <span className={estilos.errorRenglon}>{errorRenglon}</span>}
                        </li>
                    );
                })}
            </ul>
            {renglones.length === 0 && <p className={estilos.vacio}>El lote quedaría sin insumos declarados.</p>}

            <AgregarInsumoLote
                insumos={insumos}
                unidades={unidades}
                yaAgregados={renglones.map((renglon) => renglon.insumoId)}
                onAgregar={(elegido) =>
                    setRenglones((actuales) => [
                        ...actuales,
                        {
                            insumoId: elegido.insumo.id,
                            nombre: elegido.insumo.nombre,
                            magnitud: elegido.insumo.unidad_medida.magnitud,
                            cantidad: String(elegido.cantidadBase),
                            declarado: 0,
                        },
                    ])
                }
            />

            {error && <p className={estilos.errorRenglon} role="alert">{error}</p>}
            <div className={estilos.accionesCorreccion}>
                <Boton variant="volver" onClick={onCancelar} disabled={guardando}>Cancelar</Boton>
                <Boton variant="guardar" onClick={guardar} disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Guardar corrección'}
                </Boton>
            </div>
        </div>
    );
}
