import type { FilaNutricionalNormativa, InformacionNutricionalProducto } from '../../types/datosNutricionales';
import Boton from '../../components/Boton';
//import { descargarImagenCanvas } from '../../utils/archivos';
import { formatearValor } from './nutrientes';
import estilos from './DatosNutricionales.module.css';
import styles from '../../styles/shared.module.css';

import { exportarTablaNutricionalImagen, exportarTablaNutricionalPDF } from '../../utils/exportarTablaNutricional';

interface TablaNutricionalProps {
    datos: InformacionNutricionalProducto;
    mostrarAcciones?: boolean;
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

export default function TablaNutricional({ datos, mostrarAcciones = true }: TablaNutricionalProps) {
    const esCompleta = datos.estado === 'completa';
    const encabezadoCien = `Por 100 ${datos.unidad_base}`;

    const handleDescargarPDF = () => {
        exportarTablaNutricionalPDF(datos);
    };
    const handleDescargarImagen = () => {
        exportarTablaNutricionalImagen(datos);
    };

    return (
        <div className={estilos.contenedorRotulo}>
            {mostrarAcciones && (
                <div className={`${estilos.encabezadoAccionesRotulo} ${estilos.ocultarEnImpresion}`}>
                    <span className={`${estilos.estadoRotulo} ${esCompleta ? estilos.estadoCompleta : estilos.estadoIncompleta}`}>
                        {esCompleta ? 'Tabla completa' : 'Tabla incompleta'}
                    </span>

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
        </div>
    );
}