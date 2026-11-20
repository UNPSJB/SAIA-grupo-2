import { Link } from 'react-router-dom';

import estilos from './RotuladoFrontal.module.css';

export default function ModuloDesactivado() {
    return (
        <div className={estilos.aviso}>
            <strong>El módulo de rotulado frontal está desactivado.</strong> No se evalúan sellos ni leyendas mientras
            siga así. Se puede volver a activar desde{' '}
            <Link to="/configuracion/parametros-normativos">Configuración › Parámetros normativos</Link>.
        </div>
    );
}
