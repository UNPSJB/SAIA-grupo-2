import { useState, type FormEvent } from 'react';
import type { Insumo } from '../../types/insumos';
import type { UnidadMedida } from '../../types/unidadesMedida';
import { agregarStockInsumo } from '../../services/insumosServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';
import CampoCantidad from './CampoCantidad';
import { convertirABase, formatearStock, unidadesCompatibles } from './cantidades';

interface SumarStockModalProps {
    insumo: Insumo;
    unidades: UnidadMedida[];
    onCerrar: () => void;
    onGuardado: () => void;
}

export default function SumarStockModal({ insumo, unidades, onCerrar, onGuardado }: SumarStockModalProps) {
    const magnitud = insumo.unidad_medida.magnitud;
    const opciones = unidadesCompatibles(unidades, magnitud);
    const [cantidad, setCantidad] = useState('');
    const [unidadId, setUnidadId] = useState(String(insumo.unidad_medida_id));
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

    const unidad = opciones.find((u) => String(u.id) === unidadId);
    const valor = Number(cantidad);
    const valido = cantidad !== '' && valor > 0 && unidad !== undefined;

    const confirmar = async (e: FormEvent) => {
        e.preventDefault();
        if (!valido) {
            setError('Ingresá una cantidad mayor a 0.');
            return;
        }
        setGuardando(true);
        setError('');
        try {
            await agregarStockInsumo(insumo.id, valor, Number(unidadId));
            onGuardado();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo sumar el stock.');
            setGuardando(false);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent} role="dialog" aria-modal="true" aria-labelledby="titulo-sumar-stock">
                <h3 id="titulo-sumar-stock">Sumar stock</h3>
                <p>
                    <strong>{insumo.nombre}</strong>
                    <br />
                    Stock actual: <strong>{formatearStock(insumo.cantidad, magnitud)}</strong>
                </p>
                <form onSubmit={confirmar} noValidate>
                    <CampoCantidad
                        id="cantidad-stock"
                        etiqueta="Cantidad a sumar"
                        cantidad={cantidad}
                        unidadId={unidadId}
                        unidades={opciones}
                        onCambiarCantidad={setCantidad}
                        onCambiarUnidad={setUnidadId}
                        autoFocus
                        error={error}
                        ayuda={valido && unidad
                            ? `Quedarán ${formatearStock(insumo.cantidad + convertirABase(valor, unidad), magnitud)} en stock.`
                            : 'Se registra en gramos (o litros si es líquido), sin importar la unidad en que lo cargues.'}
                    />
                    <div className={styles.filaBotones}>
                        <Boton type="button" variant="volver" onClick={onCerrar}>Cancelar</Boton>
                        <Boton type="submit" variant="guardar" disabled={guardando}>
                            {guardando ? 'Guardando...' : 'Sumar al stock'}
                        </Boton>
                    </div>
                </form>
            </div>
        </div>
    );
}
