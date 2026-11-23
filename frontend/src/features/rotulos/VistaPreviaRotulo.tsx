import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import Boton from '../../components/Boton';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import { getRotuloProducto, getVistaPreviaRotulo } from '../../services/rotulosServices';
import type { VistaPreviaRotulo as Vista } from '../../types/rotulos';
import shared from '../../styles/shared.module.css';
import { formatearFechaHora } from '../datosNutricionales/nutrientes';
import { formatearFecha } from '../productos/formatoProducto';
import LeyendaPrecaucion from '../rotuladoFrontal/LeyendaPrecaucion';
import OctogonoAdvertencia from '../rotuladoFrontal/OctogonoAdvertencia';
import styles from './VistaPreviaRotulo.module.css';

const LEYENDA_BORRADOR =
    'BORRADOR: debe ser revisado por un/a profesional y por la autoridad sanitaria competente antes de su uso';

interface Estado {
    clave: string;
    vista: Vista | null;
    sinRotulo: boolean;
    error: string;
}

function dato(valor: string | number | null | undefined, faltante = 'Sin completar'): string {
    if (valor === null || valor === undefined || valor === '') return faltante;
    return String(valor);
}

function contenidoNeto(vista: Vista): string {
    const { contenido_neto, unidad_contenido_neto } = vista.cara_principal;
    if (contenido_neto === null) return 'Contenido neto: sin completar';
    return `Contenido neto ${contenido_neto.toLocaleString('es-AR')} ${unidad_contenido_neto ?? ''}`.trim();
}

function LeyendaBorrador({ texto }: { texto: string }) {
    return (
        <div className={styles.leyendaBorrador} role="note">
            <i className="bi bi-exclamation-octagon-fill" aria-hidden="true"></i>
            <span>{texto || LEYENDA_BORRADOR}</span>
        </div>
    );
}

function Advertencias({ vista }: { vista: Vista }) {
    if (vista.completo) {
        return (
            <div className={styles.avisoOk}>
                <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
                <span>El borrador tiene todos los datos obligatorios y no hay advertencias pendientes.</span>
            </div>
        );
    }

    return (
        <section className={styles.avisos} aria-live="polite">
            <h3>
                <i className="bi bi-exclamation-triangle-fill" aria-hidden="true"></i> Revisá antes de usar este borrador
            </h3>
            {vista.faltantes.length > 0 && (
                <>
                    <strong>Faltan datos obligatorios:</strong>
                    <ul>
                        {vista.faltantes.map((faltante) => (
                            <li key={faltante}>{faltante}</li>
                        ))}
                    </ul>
                </>
            )}
            {vista.advertencias.length > 0 && (
                <>
                    <strong>Advertencias:</strong>
                    <ul>
                        {vista.advertencias.map((advertencia) => (
                            <li key={advertencia}>{advertencia}</li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    );
}

function CaraPrincipal({ vista }: { vista: Vista }) {
    const cara = vista.cara_principal;
    const conAdvertencias = cara.sellos.length > 0 || cara.leyendas.length > 0;

    return (
        <article className={styles.cara}>
            <span className={styles.etiquetaCara}>Cara principal</span>
            {conAdvertencias && (
                <div className={styles.sellos}>
                    {cara.sellos.map((sello) => (
                        <OctogonoAdvertencia key={sello.sello} sello={sello.sello} texto={sello.texto} tamano="pequeno" />
                    ))}
                    {cara.leyendas.map((leyenda) => (
                        <LeyendaPrecaucion key={leyenda.sello} sello={leyenda.sello} texto={leyenda.texto} tamano="pequeno" />
                    ))}
                </div>
            )}
            <h1 className={cara.denominacion_venta ? styles.denominacion : `${styles.denominacion} ${styles.faltante}`}>
                {dato(cara.denominacion_venta, 'Denominación de venta sin completar')}
            </h1>
            <p className={styles.producto}>{vista.producto.nombre}</p>
            {!conAdvertencias && cara.motivo && <p className={styles.sinSellos}>{cara.motivo}</p>}
            {cara.calculo_provisorio && <p className={styles.provisorio}>Cálculo de sellos provisorio</p>}
            <p className={cara.contenido_neto === null ? `${styles.contenidoNeto} ${styles.faltante}` : styles.contenidoNeto}>
                {contenidoNeto(vista)}
            </p>
            {cara.parametros_version !== null && (
                <p className={styles.notaChica}>
                    Sellos según parámetros normativos v{cara.parametros_version}
                    {cara.parametros_fecha_vigencia && `, vigentes desde el ${formatearFecha(cara.parametros_fecha_vigencia)}`}
                    {cara.receta_version_calculo !== null && ` · receta v${cara.receta_version_calculo}`}
                </p>
            )}
        </article>
    );
}

function TablaNutricional({ vista }: { vista: Vista }) {
    const tabla = vista.tabla_nutricional;
    const base = vista.producto.tipo === 'bebida' ? '100 ml' : '100 g';
    const unidadPorcion = vista.producto.tipo === 'bebida' ? 'ml' : 'g';

    if (!tabla) {
        return <p className={styles.faltante}>Información nutricional sin datos: el producto no tiene receta vigente.</p>;
    }

    return (
        <div className={styles.tablaNutricional}>
            <table>
                <caption>
                    INFORMACIÓN NUTRICIONAL
                    <span>
                        Porción {tabla.porcion_gramos.toLocaleString('es-AR')} {unidadPorcion}
                        {tabla.medida_casera && ` (${tabla.medida_casera})`}
                    </span>
                </caption>
                <thead>
                    <tr>
                        <th></th>
                        <th>Cantidad por {base}</th>
                        <th>Cantidad por porción</th>
                        <th>% VD (*)</th>
                    </tr>
                </thead>
                <tbody>
                    {tabla.filas.map((fila) => (
                        <tr key={fila.nutriente} className={fila.subnivel ? styles.subnivel : undefined}>
                            <th scope="row">{fila.nombre}</th>
                            <td>{fila.valor_100g}</td>
                            <td>{fila.valor_porcion}</td>
                            <td>{fila.porcentaje_vd}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className={styles.notaChica}>{tabla.nota_pie}</p>
            {tabla.estado === 'incompleta' && (
                <p className={styles.provisorio}>TABLA INCOMPLETA: faltan datos de {tabla.insumos_sin_datos.join(', ')}.</p>
            )}
        </div>
    );
}

function Informacion({ vista }: { vista: Vista }) {
    const { origen, lote } = vista;

    return (
        <article className={styles.informacion}>
            <span className={styles.etiquetaCara}>Información obligatoria</span>

            <p className={vista.lista_ingredientes ? undefined : styles.faltante}>
                {dato(vista.lista_ingredientes, 'Lista de ingredientes sin completar')}
            </p>
            {vista.alergenos.contiene && <p className={styles.alergenos}>{vista.alergenos.contiene}</p>}
            {vista.alergenos.puede_contener && <p className={styles.alergenos}>{vista.alergenos.puede_contener}</p>}

            <dl className={styles.datos}>
                <div>
                    <dt>Elaborado por</dt>
                    <dd className={origen.razon_social ? undefined : styles.faltante}>
                        {dato(origen.razon_social)} — {dato(origen.domicilio)}
                    </dd>
                </div>
                {origen.es_importado && (
                    <div>
                        <dt>Importado por</dt>
                        <dd>
                            {dato(origen.razon_social_importador)} — {dato(origen.domicilio_importador)}. País de origen:{' '}
                            {dato(origen.pais_origen)}
                        </dd>
                    </div>
                )}
                <div>
                    <dt>RNPA / RPPA</dt>
                    <dd className={origen.rnpa_rppa ? undefined : styles.faltante}>{dato(origen.rnpa_rppa)}</dd>
                </div>
                <div>
                    <dt>Lote</dt>
                    <dd className={lote ? undefined : styles.faltante}>{lote ? lote.nro_lote : 'Sin lote asociado'}</dd>
                </div>
                <div>
                    <dt>Consumir antes de</dt>
                    <dd className={lote?.fecha_duracion ? undefined : styles.faltante}>
                        {lote?.fecha_duracion ? formatearFecha(lote.fecha_duracion) : 'Sin completar'}
                    </dd>
                </div>
                {vista.conservacion && (
                    <div>
                        <dt>Conservación</dt>
                        <dd>{vista.conservacion}</dd>
                    </div>
                )}
                {vista.instrucciones_uso && (
                    <div>
                        <dt>Preparación e instrucciones de uso</dt>
                        <dd>{vista.instrucciones_uso}</dd>
                    </div>
                )}
            </dl>

            <TablaNutricional vista={vista} />
        </article>
    );
}

export default function VistaPreviaRotulo() {
    const { productoId = '' } = useParams<{ productoId: string }>();
    const [rotuloLoteId, setRotuloLoteId] = useState<number | null>(null);
    const [estado, setEstado] = useState<Estado | null>(null);
    const clave = `${productoId}-${rotuloLoteId ?? ''}`;

    useEffect(() => {
        let cancelado = false;
        getRotuloProducto(productoId)
            .then(async (rotulo) => {
                if (!rotulo) return { clave, vista: null, sinRotulo: true, error: '' };
                const vista = await getVistaPreviaRotulo(rotulo.id, rotuloLoteId);
                return { clave, vista, sinRotulo: false, error: '' };
            })
            .catch((problema: unknown) => ({
                clave,
                vista: null,
                sinRotulo: false,
                error: problema instanceof Error ? problema.message : 'No se pudo armar la vista previa.',
            }))
            .then((resultado) => {
                if (!cancelado) setEstado(resultado);
            });
        return () => {
            cancelado = true;
        };
    }, [productoId, rotuloLoteId, clave]);

    const actual = estado;
    const vista = actual?.vista ?? null;
    const volver = (
        <Link to={`/rotulos/producto/${productoId}`}>
            <Boton variant="volver">Volver al rótulo</Boton>
        </Link>
    );

    return (
        <div className={shared.contenedorPrincipal}>
            <div className={styles.noImprimir}>
                <EncabezadoPagina
                    titulo={vista ? `Vista previa del rótulo · ${vista.producto.nombre}` : 'Vista previa del rótulo'}
                    descripcion="Así quedaría el rótulo con los datos guardados. Es un borrador para revisión profesional, no un rótulo aprobado."
                    acciones={
                        <>
                            {vista && (
                                <Boton variant="descargar" onClick={() => window.print()}>
                                    Imprimir borrador
                                </Boton>
                            )}
                            {volver}
                        </>
                    }
                />
            </div>

            {actual === null && <p className={shared.emptyMensaje}>Armando la vista previa…</p>}
            {actual?.error && <p className={shared.textDanger}>{actual.error}</p>}
            {actual?.sinRotulo && (
                <p className={shared.emptyMensaje}>
                    El producto todavía no tiene borrador de rótulo. Completá sus datos para poder previsualizarlo.
                </p>
            )}

            {vista && (
                <div className={styles.areaImpresion}>
                    <Advertencias vista={vista} />

                    {vista.lotes.length > 1 && (
                        <div className={`${styles.selectorLote} ${styles.noImprimir}`}>
                            <label htmlFor="loteVista">Lote a mostrar</label>
                            <select
                                id="loteVista"
                                value={vista.lote?.rotulo_lote_id ?? ''}
                                onChange={(e) => setRotuloLoteId(Number(e.target.value))}
                            >
                                {vista.lotes.map((lote) => (
                                    <option key={lote.rotulo_lote_id} value={lote.rotulo_lote_id}>
                                        Lote {lote.nro_lote} · elaborado el {formatearFecha(lote.fecha_elaboracion)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className={styles.rotulo}>
                        <LeyendaBorrador texto={vista.leyenda_borrador} />
                        <div className={styles.caras}>
                            <CaraPrincipal vista={vista} />
                            <Informacion vista={vista} />
                        </div>
                        <LeyendaBorrador texto={vista.leyenda_borrador} />
                    </div>

                    <p className={styles.pie}>
                        Generado el {formatearFechaHora(vista.fecha_generacion)}
                        {vista.receta_version !== null && ` con la versión ${vista.receta_version} de la receta`}.
                    </p>
                </div>
            )}
        </div>
    );
}
