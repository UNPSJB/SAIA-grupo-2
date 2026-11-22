import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { Alergeno, MarcaAlergenos, MarcaAlergenosInsumo } from '../../types/alergenos';
import { actualizarMarcasAlergenos, getMarcasAlergenos } from '../../services/alergenosServices';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import BuscadorTexto from '../../components/BuscadorTexto';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import { filtrarPorTexto } from '../../utils/texto';
import { ALERGENOS, AYUDA_ALERGENO, CEREALES_CON_GLUTEN, ETIQUETA_ALERGENO } from './etiquetas';
import estilos from './Alergenos.module.css';
import styles from '../../styles/shared.module.css';

interface Respuesta {
    marcas: MarcaAlergenosInsumo[];
    error: boolean;
}

function soloMarcas(marca: MarcaAlergenos): MarcaAlergenos {
    return { alergenos: marca.alergenos, contiene_gluten: marca.contiene_gluten };
}

export default function MarcasAlergenosInsumos() {
    const { usuario } = useAuth();
    const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
    const [cambios, setCambios] = useState<Record<number, MarcaAlergenos>>({});
    const [busqueda, setBusqueda] = useState('');
    const [soloSinRevisar, setSoloSinRevisar] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

    useEffect(() => {
        let cancelado = false;

        getMarcasAlergenos()
            .then((marcas) => {
                if (!cancelado) setRespuesta({ marcas, error: false });
            })
            .catch((problema) => {
                console.error('Error al cargar las marcas de alérgenos:', problema);
                if (!cancelado) setRespuesta({ marcas: [], error: true });
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

    const valoresDe = (marca: MarcaAlergenosInsumo): MarcaAlergenos => cambios[marca.insumo.id] ?? soloMarcas(marca);

    const registrar = (marca: MarcaAlergenosInsumo, valores: MarcaAlergenos) => {
        setCambios((anteriores) => ({ ...anteriores, [marca.insumo.id]: valores }));
        setMensaje(null);
    };

    const alternarAlergeno = (marca: MarcaAlergenosInsumo, alergeno: Alergeno) => {
        const valores = valoresDe(marca);
        const marcado = valores.alergenos.includes(alergeno);
        const alergenos = marcado
            ? valores.alergenos.filter((actual) => actual !== alergeno)
            : [...valores.alergenos, alergeno];
        const sumaGluten = !marcado && CEREALES_CON_GLUTEN.includes(alergeno);
        registrar(marca, { alergenos, contiene_gluten: valores.contiene_gluten || sumaGluten });
    };

    const guardar = async () => {
        if (!usuario || cantidadCambios === 0) return;
        setGuardando(true);
        setMensaje(null);
        try {
            const actualizadas = await actualizarMarcasAlergenos(
                usuario.id,
                Object.entries(cambios).map(([insumoId, valores]) => ({ insumo_id: Number(insumoId), ...valores })),
            );
            setRespuesta({ marcas: actualizadas, error: false });
            setCambios({});
            setMensaje({ tipo: 'exito', texto: 'Marcas guardadas.' });
        } catch (problema) {
            setMensaje({ tipo: 'error', texto: problema instanceof Error ? problema.message : 'No se pudieron guardar las marcas.' });
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Marcas de Alérgenos"
                descripcion="Alérgenos y gluten que aporta cada insumo, sea ingrediente o aditivo. Con estas marcas el sistema propone la declaración de cada producto a partir de su receta. Al marcar trigo, centeno, cebada o avena se marca también el gluten; se puede desmarcar."
                ancho="960px"
                acciones={
                    <Link to="/alergenos">
                        <Boton variant="volver">Volver a alérgenos</Boton>
                    </Link>
                }
            />

            <section className={`${styles.tarjetaEstatica} ${estilos.panel}`}>
                <div className={estilos.barra}>
                    <BuscadorTexto valor={busqueda} onCambio={setBusqueda} placeholder="Buscar insumo..." />
                    <label>
                        <input type="checkbox" checked={soloSinRevisar} onChange={() => setSoloSinRevisar(!soloSinRevisar)} />
                        Solo sin revisar ({sinRevisar})
                    </label>
                </div>

                {respuesta?.error && <p className={estilos.mensajeError}>No se pudieron cargar los insumos.</p>}

                <div className={estilos.desplazable}>
                    <table className={estilos.tablaMarcas}>
                        <thead>
                            <tr>
                                <th>Insumo</th>
                                {ALERGENOS.map((alergeno) => (
                                    <th key={alergeno} title={AYUDA_ALERGENO[alergeno]}>
                                        {ETIQUETA_ALERGENO[alergeno]}
                                    </th>
                                ))}
                                <th className={estilos.columnaGluten}>Gluten</th>
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
                                        {ALERGENOS.map((alergeno) => (
                                            <td key={alergeno}>
                                                <input
                                                    type="checkbox"
                                                    aria-label={`${marca.insumo.nombre}: ${ETIQUETA_ALERGENO[alergeno]}`}
                                                    checked={valores.alergenos.includes(alergeno)}
                                                    onChange={() => alternarAlergeno(marca, alergeno)}
                                                />
                                            </td>
                                        ))}
                                        <td className={estilos.columnaGluten}>
                                            <input
                                                type="checkbox"
                                                aria-label={`${marca.insumo.nombre}: contiene gluten`}
                                                checked={valores.contiene_gluten}
                                                onChange={() =>
                                                    registrar(marca, { ...valores, contiene_gluten: !valores.contiene_gluten })
                                                }
                                            />
                                        </td>
                                        <td>
                                            {modificado ? (
                                                <span className={estilos.pastilla}>Sin guardar</span>
                                            ) : marca.revisado ? (
                                                <span className={`${estilos.pastilla} ${estilos.pastillaConfirmada}`}>Revisado</span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className={estilos.botonTexto}
                                                    title="Confirmar que el insumo no tiene alérgenos ni gluten"
                                                    onClick={() => registrar(marca, soloMarcas(marca))}
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
                                    <td colSpan={ALERGENOS.length + 3} className={styles.textMuted}>
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
