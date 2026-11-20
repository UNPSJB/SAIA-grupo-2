import type { EvaluacionRotulado } from '../../types/rotuladoFrontal';
import { formatearFechaHora, nombreCompleto } from '../datosNutricionales/nutrientes';
import { RESULTADO, origenDeMarcas } from '../parametrosNormativos/etiquetas';
import estilos from './RotuladoFrontal.module.css';

interface ResultadoRotuladoProps {
    evaluacion: EvaluacionRotulado;
    mostrarDetalle?: boolean;
}

const ICONO_TONO = {
    alerta: 'bi-exclamation-octagon-fill',
    exito: 'bi-check-circle-fill',
    neutro: 'bi-dash-circle-fill',
};

export default function ResultadoRotulado({ evaluacion, mostrarDetalle = true }: ResultadoRotuladoProps) {
    const descripcion = RESULTADO[evaluacion.resultado];

    return (
        <div className={`${estilos.resultado} ${estilos[`tono_${descripcion.tono}`]}`}>
            <i className={`bi ${ICONO_TONO[descripcion.tono]}`} aria-hidden="true"></i>
            <div>
                <strong>{descripcion.titulo}</strong>
                <p>{evaluacion.resultado === 'exceptuado' && evaluacion.excepcion ? evaluacion.excepcion : descripcion.detalle}</p>

                {evaluacion.sellos_a_evaluar.length > 0 && (
                    <div className={estilos.grupoSellos}>
                        <span>Sellos de exceso a evaluar</span>
                        <div className={estilos.sellos}>
                            {evaluacion.sellos_a_evaluar.map((sello) => (
                                <span key={sello.sello} className={estilos.sello}>
                                    {sello.texto}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {evaluacion.leyendas.length > 0 && (
                    <div className={estilos.grupoSellos}>
                        <span>Leyendas precautorias</span>
                        <div className={estilos.sellos}>
                            {evaluacion.leyendas.map((leyenda) => (
                                <span key={leyenda.sello} className={estilos.leyenda}>
                                    {leyenda.texto}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {mostrarDetalle && (
                    <div className={estilos.meta}>
                        Evaluado el {formatearFechaHora(evaluacion.fecha)} por {nombreCompleto(evaluacion.evaluado_por)} con
                        los parámetros v{evaluacion.parametros.version}.
                        {evaluacion.envasado_en_ausencia_del_cliente &&
                            !evaluacion.excepcion &&
                            ` Marcas: ${origenDeMarcas(evaluacion).toLowerCase()}.`}
                    </div>
                )}
            </div>
        </div>
    );
}
