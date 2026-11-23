import { useState } from 'react';
import type { FilaNutricionalNormativa, InformacionNutricionalProducto } from '../../types/datosNutricionales';
import Boton from '../../components/Boton';
import InsigniaEstadoNutricional from './InsigniaEstadoNutricional';
import CompletarNutrientesModal from './CompletarNutrientesModal';
import { formatearValor } from './nutrientes';
import estilos from './DatosNutricionales.module.css';
import styles from '../../styles/shared.module.css';

import { exportarTablaNutricionalImagen, exportarTablaNutricionalPDF } from '../../utils/exportarTablaNutricional';

interface TablaNutricionalProps {
    datos: InformacionNutricionalProducto;
    mostrarAcciones?: boolean;
    onRecalcular?: () => void;
}

function textoPorcion(datos: InformacionNutricionalProducto): string {
    if (!datos.porcion) return 'Porción no declarada';
    const base = `${formatearValor(datos.porcion)} ${datos.unidad_base}`;
    return datos.medida_casera ? `${base} (${datos.medida_casera})` : base;
}

export function formatearCeldaValor(valor: number | null, unidad: string, completo: boolean): string {
    if (valor === null) return 'Sin dato';
    const texto = `${formatearValor(valor)} ${unidad}`;
    return completo ? texto : `${texto} *`;
}

function formatearCeldaVd(fila: FilaNutricionalNormativa): string {
    if (fila.porcentaje_vd === null) return '—';
    return `${fila.porcentaje_vd}%`;
}

export default function TablaNutricional({ datos, mostrarAcciones = true, onRecalcular }: TablaNutricionalProps) {
    const [insumoACompletar, setInsumoACompletar] = useState<{ id: number; nombre: string } | null>(null);
    const esCompleta = datos.estado === 'completa';
    const encabezadoCien = `Por 100 ${datos.unidad_base}`;

    const handleDescargarPDF = () => {
        exportarTablaNutricionalPDF(datos);
    };
    const handleDescargarImagen = () => {
        exportarTablaNutricionalImagen(datos);
    };

    const tieneFaltantes = Boolean(datos.faltantes && datos.faltantes.length > 0);

    return (
        <div className={estilos.contenedorRotulo}>
            {mostrarAcciones && (
                <div className={`${estilos.encabezadoAccionesRotulo} ${estilos.ocultarEnImpresion}`}>
                    <InsigniaEstadoNutricional estado={datos.estado} />

                    <div className={styles.grupoBotonesTabla}>
                        <Boton variant="documentos" onClick={handleDescargarPDF}>
                            Imprimir / PDF
                        </Boton>
                        <Boton variant="descargar" onClick={handleDescargarImagen}>
                            Descargar imagen
                        </Boton>
                    </div>
                </div>
            )}

            {mostrarAcciones && !esCompleta && tieneFaltantes && (
                <div className={`${estilos.avisoFaltantes} ${estilos.ocultarEnImpresion}`} role="alert">
                    <div className={estilos.tituloAvisoFaltantes}>
                        Advertencia: Ingredientes con datos incompletos
                    </div>
                    <p style={{ margin: 0 }}>
                        La receta contiene ingredientes sin datos nutricionales completos o sin fuente registrada:
                    </p>
                    <ul className={estilos.listaFaltantes}>
                        {datos.faltantes!.map((f) => (
                            <li key={f.insumo_id} className={estilos.itemFaltante}>
                                <strong>{f.insumo_nombre}</strong>
                                {f.tipo_uso === 'aditivo' && ' (Aditivo con marca de aporte)'}
                                {f.datos_faltantes.length > 0 && (
                                    <span className={estilos.detalleFaltante}>
                                        Nutrientes faltantes: {f.datos_faltantes.join(', ')}
                                    </span>
                                )}
                                {f.sin_fuente.length > 0 && (
                                    <span className={estilos.detalleFaltante}>
                                        Sin fuente registrada: {f.sin_fuente.join(', ')}
                                    </span>
                                )}
                                <div className={estilos.botonCompletarFaltante}>
                                    <Boton
                                        variant="editar"
                                        onClick={() =>
                                            setInsumoACompletar({
                                                id: f.insumo_id,
                                                nombre: f.insumo_nombre,
                                            })
                                        }
                                    >
                                        Completar
                                    </Boton>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <section className={estilos.cuadroNormativo} aria-label="Tabla de información nutricional">
                <h3 className={estilos.tituloNormativo}>Información Nutricional</h3>
                <p className={estilos.porcionNormativa}>
                    <strong>Porción:</strong> {textoPorcion(datos)}
                </p>

                {!esCompleta && (
                    <div className={estilos.marcaIncompletaImpresa} role="status">
                        <strong>Tabla incompleta:</strong>{' '}
                        {datos.insumos_sin_datos.length > 0
                            ? `Faltan datos nutricionales en: ${datos.insumos_sin_datos.join(', ')}.`
                            : !datos.porcion
                              ? 'Falta declarar la porción.'
                              : 'El producto todavía no tiene lotes con insumos registrados.'}
                    </div>
                )}

                <table className={estilos.tablaNormativa}>
                    <thead>
                        <tr>
                            <th scope="col">Cantidad</th>
                            <th scope="col">{encabezadoCien}</th>
                            <th scope="col">Por porción</th>
                            <th scope="col">% VD (*)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {datos.filas.map((fila) => (
                            <tr key={fila.nutriente}>
                                <td className={fila.subnivel ? estilos.celdaSubnivel : estilos.celdaPrincipal}>
                                    {fila.nombre}
                                </td>
                                <td>
                                    {fila.valor_100g === null ? (
                                        <span className={estilos.datoFaltante}>Sin dato</span>
                                    ) : (
                                        <>
                                            {formatearValor(fila.valor_100g)} {fila.unidad}
                                            {!fila.completo && <span className={estilos.datoFaltante}> (inc.)</span>}
                                        </>
                                    )}
                                </td>
                                <td>
                                    {fila.valor_porcion === null ? (
                                        <span className={estilos.datoFaltante}>—</span>
                                    ) : (
                                        <>
                                            {formatearValor(fila.valor_porcion)} {fila.unidad}
                                            {!fila.completo && <span className={estilos.datoFaltante}> (inc.)</span>}
                                        </>
                                    )}
                                </td>
                                <td>{formatearCeldaVd(fila)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <p className={estilos.notaPieNormativa}>{datos.nota_pie}</p>
                <p className={estilos.leyendaNormativa}>{datos.leyenda}</p>
            </section>

            {insumoACompletar && (
                <CompletarNutrientesModal
                    insumoId={insumoACompletar.id}
                    insumoNombre={insumoACompletar.nombre}
                    onClose={() => setInsumoACompletar(null)}
                    onGuardadoExitoso={() => {
                        setInsumoACompletar(null);
                        if (onRecalcular) {
                            onRecalcular();
                        }
                    }}
                />
            )}
        </div>
    );
}