import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { Agregado } from '../../types/parametrosNormativos';
import type { MarcaInsumo, MarcasAgregados } from '../../types/rotuladoFrontal';
import { getModuloRotuladoFrontal } from '../../services/parametrosNormativosServices';
import { actualizarMarcasInsumos, getMarcasInsumos } from '../../services/rotuladoFrontalServices';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import BuscadorTexto from '../../components/BuscadorTexto';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import { filtrarPorTexto } from '../../utils/texto';
import { AGREGADOS, CAMPO_AGREGADO, ETIQUETA_AGREGADO, ETIQUETA_AGREGADO_CORTA } from '../parametrosNormativos/etiquetas';
import ModuloDesactivado from './ModuloDesactivado';
import estilos from './RotuladoFrontal.module.css';
import styles from '../../styles/shared.module.css';

interface Respuesta {
    activo: boolean;
    marcas: MarcaInsumo[];
    error: boolean;
}

function soloMarcas(marca: MarcasAgregados): MarcasAgregados {
    return {
        agrega_azucares: marca.agrega_azucares,
        agrega_grasas: marca.agrega_grasas,
        agrega_sodio: marca.agrega_sodio,
        contiene_edulcorantes: marca.contiene_edulcorantes,
        contiene_cafeina: marca.contiene_cafeina,
    };
}

export default function MarcasInsumos() {
    const { usuario } = useAuth();
    const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
    const [cambios, setCambios] = useState<Record<number, MarcasAgregados>>({});
    const [busqueda, setBusqueda] = useState('');
    const [soloSinRevisar, setSoloSinRevisar] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

    useEffect(() => {
        let cancelado = false;

        getModuloRotuladoFrontal()
            .then(async (modulo) => {
                const marcas = modulo.activo ? await getMarcasInsumos() : [];
                if (!cancelado) setRespuesta({ activo: modulo.activo, marcas, error: false });
            })
            .catch((problema) => {
                console.error('Error al cargar las marcas de los insumos:', problema);
                if (!cancelado) setRespuesta({ activo: true, marcas: [], error: true });
            });

        return () => {
            cancelado = true;
        };
    }, []);

    const marcas = respuesta?.marcas ?? [];
    const sinRevisar = marcas.filter((marca) => !marca.revisado).length;
    const cantidadCambios = Object.keys(cambios).length;
    const visibles = filtrarPorTexto(
        soloSinRevisar ? marcas.filter((marca) => !marca.revisado || cambios[marca.insumo.id]) : marcas,
        busqueda,
        (marca) => [marca.insumo.nombre],
    );

    const valoresDe = (marca: MarcaInsumo): MarcasAgregados => cambios[marca.insumo.id] ?? soloMarcas(marca);

    const alternar = (marca: MarcaInsumo, agregado: Agregado) => {
        const campo = CAMPO_AGREGADO[agregado];
        const valores = valoresDe(marca);
        setCambios((anteriores) => ({ ...anteriores, [marca.insumo.id]: { ...valores, [campo]: !valores[campo] } }));
        setMensaje(null);
    };

    const confirmarSinMarcas = (marca: MarcaInsumo) => {
        setCambios((anteriores) => ({ ...anteriores, [marca.insumo.id]: soloMarcas(marca) }));
        setMensaje(null);
    };

    const guardar = async () => {
        if (!usuario || cantidadCambios === 0) return;
        setGuardando(true);
        setMensaje(null);
        try {
            const actualizadas = await actualizarMarcasInsumos(
                usuario.id,
                Object.entries(cambios).map(([insumoId, valores]) => ({ insumo_id: Number(insumoId), ...valores })),
            );
            setRespuesta({ activo: true, marcas: actualizadas, error: false });
            setCambios({});
            setMensaje({ tipo: 'exito', texto: 'Marcas guardadas.' });
        } catch (problema) {
            setMensaje({ tipo: 'error', texto: problema instanceof Error ? problema.message : 'No se pudieron guardar las marcas.' });
        } finally {
            setGuardando(false);
        }
    };

    const volver = (
        <Link to="/rotulado-frontal">
            <Boton variant="volver">Volver al rotulado frontal</Boton>
        </Link>
    );

    if (respuesta !== null && !respuesta.activo) {
        return (
            <div className={styles.contenedorPrincipal}>
                <EncabezadoPagina titulo="Marcas de Insumos" ancho="900px" />
                <ModuloDesactivado />
                {volver}
            </div>
        );
    }

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Marcas de Insumos"
                descripcion="Qué aporta cada insumo cuando forma parte de una receta. Con estas marcas y las clases de los aditivos se propone, para cada producto, si tiene azúcares, grasas o sodio agregados, o si contiene edulcorantes o cafeína."
                ancho="900px"
                acciones={volver}
            />

            <section className={`${styles.tarjetaEstatica} ${estilos.panel}`}>
                <div className={estilos.barraMarcas}>
                    <BuscadorTexto valor={busqueda} onCambio={setBusqueda} placeholder="Buscar insumo..." />
                    <label>
                        <input
                            type="checkbox"
                            checked={soloSinRevisar}
                            onChange={() => setSoloSinRevisar(!soloSinRevisar)}
                        />
                        Solo sin revisar ({sinRevisar})
                    </label>
                </div>

                {respuesta?.error && <p className={estilos.mensajeError}>No se pudieron cargar los insumos.</p>}

                <div className={estilos.desplazable}>
                    <table className={estilos.tablaMarcas}>
                        <thead>
                            <tr>
                                <th>Insumo</th>
                                {AGREGADOS.map((agregado) => (
                                    <th key={agregado}>{ETIQUETA_AGREGADO_CORTA[agregado]}</th>
                                ))}
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibles.map((marca) => {
                                const valores = valoresDe(marca);
                                const modificado = cambios[marca.insumo.id] !== undefined;
                                return (
                                    <tr key={marca.insumo.id} className={modificado ? estilos.filaModificada : ''}>
                                        <td>{marca.insumo.nombre}</td>
                                        {AGREGADOS.map((agregado) => (
                                            <td key={agregado}>
                                                <input
                                                    type="checkbox"
                                                    aria-label={`${marca.insumo.nombre}: ${ETIQUETA_AGREGADO[agregado]}`}
                                                    checked={valores[CAMPO_AGREGADO[agregado]]}
                                                    onChange={() => alternar(marca, agregado)}
                                                />
                                            </td>
                                        ))}
                                        <td>
                                            {modificado ? (
                                                <span className={estilos.pastilla}>Sin guardar</span>
                                            ) : marca.revisado ? (
                                                <span className={`${estilos.pastilla} ${estilos.pastilla_exito}`}>Revisado</span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className={estilos.botonTexto}
                                                    title="Confirmar que el insumo no aporta ninguno de estos agregados"
                                                    onClick={() => confirmarSinMarcas(marca)}
                                                >
                                                    Sin revisar · confirmar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {visibles.length === 0 && (
                                <tr>
                                    <td colSpan={AGREGADOS.length + 2} className={styles.textMuted}>
                                        {respuesta === null ? 'Cargando insumos…' : 'No hay insumos con los filtros aplicados.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {mensaje && (
                    <p className={mensaje.tipo === 'error' ? estilos.mensajeError : estilos.mensajeExito}>{mensaje.texto}</p>
                )}

                <div className={estilos.acciones}>
                    {cantidadCambios > 0 && (
                        <Boton variant="limpiar" onClick={() => setCambios({})} disabled={guardando}>
                            Descartar cambios
                        </Boton>
                    )}
                    <Boton variant="guardar" onClick={guardar} disabled={guardando || cantidadCambios === 0}>
                        {cantidadCambios === 0
                            ? 'Sin cambios'
                            : `Guardar ${cantidadCambios} ${cantidadCambios === 1 ? 'cambio' : 'cambios'}`}
                    </Boton>
                </div>
            </section>
        </div>
    );
}
