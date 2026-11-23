import type { SelloAdvertencia } from '../../types/parametrosNormativos';

interface Props {
    sello: SelloAdvertencia | string;
    texto?: string;
    tamano?: 'normal' | 'pequeno' | 'micro';
    numeroSellos?: number;
}

interface InfoSello {
    linea1: string;
    linea2: string[];
}

function obtenerInfoSello(sello: string, texto?: string): InfoSello {
    if (sello === 'exceso_azucares') {
        return { linea1: 'EXCESO EN', linea2: ['AZÚCARES'] };
    }
    if (sello === 'exceso_grasas_totales') {
        return { linea1: 'EXCESO EN', linea2: ['GRASAS', 'TOTALES'] };
    }
    if (sello === 'exceso_grasas_saturadas') {
        return { linea1: 'EXCESO EN', linea2: ['GRASAS', 'SATURADAS'] };
    }
    if (sello === 'exceso_sodio') {
        return { linea1: 'EXCESO EN', linea2: ['SODIO'] };
    }
    if (sello === 'exceso_calorias') {
        return { linea1: 'EXCESO EN', linea2: ['CALORÍAS'] };
    }

    const t = (texto || sello).toUpperCase().replace('EXCESO EN ', '').replace(/_/g, ' ');
    const palabras = t.split(' ');
    if (palabras.length > 1) {
        return { linea1: 'EXCESO EN', linea2: [palabras[0], palabras.slice(1).join(' ')] };
    }
    return { linea1: 'EXCESO EN', linea2: [t] };
}

export default function OctogonoAdvertencia({ sello, texto, tamano = 'normal', numeroSellos }: Props) {
    if (tamano === 'micro' || numeroSellos !== undefined) {
        const num = numeroSellos ?? 1;
        const etiquetaSellos = num === 1 ? 'SELLO' : 'SELLOS';
        return (
            <div style={{ display: 'inline-block', margin: '4px' }}>
                <svg width="65" height="65" viewBox="0 0 100 100">
                    <polygon
                        points="30,2 70,2 98,30 98,70 70,98 30,98 2,70 2,30"
                        fill="#000000"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                    />
                    <polygon
                        points="31.5,5 68.5,5 95,31.5 95,68.5 68.5,95 31.5,95 5,68.5 5,31.5"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1.2"
                    />
                    <text x="50" y="50" fill="#ffffff" fontSize="36" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">
                        {num}
                    </text>
                    <text x="50" y="68" fill="#ffffff" fontSize="11" fontWeight="800" textAnchor="middle" fontFamily="Arial, sans-serif">
                        {etiquetaSellos}
                    </text>
                    <text x="50" y="82" fill="#ffffff" fontSize="6" fontWeight="600" textAnchor="middle" fontFamily="Arial, sans-serif">
                        Ministerio de Salud
                    </text>
                </svg>
            </div>
        );
    }

    const info = obtenerInfoSello(sello, texto);
    const esPequeno = tamano === 'pequeno';
    const ancho = esPequeno ? 110 : 145;
    const alto = esPequeno ? 110 : 145;

    const tieneDosLineas = info.linea2.length > 1;

    return (
        <div style={{ display: 'inline-block', margin: '4px', verticalAlign: 'top' }}>
            <svg
                width={ancho}
                height={alto}
                viewBox="0 0 100 100"
                style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))' }}
            >
                {/* Octógono fondo negro */}
                <polygon
                    points="30,2 70,2 98,30 98,70 70,98 30,98 2,70 2,30"
                    fill="#000000"
                />
                {/* Marco blanco exterior e interior */}
                <polygon
                    points="30.5,4 69.5,4 96,30.5 96,69.5 69.5,96 30.5,96 4,69.5 4,30.5"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                />
                <polygon
                    points="32,7 68,7 93,32 93,68 68,93 32,93 7,68 7,32"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                />

                {/* Texto EXCESO EN */}
                <text
                    x="50"
                    y="27"
                    fill="#ffffff"
                    fontSize="8.5"
                    fontWeight="800"
                    textAnchor="middle"
                    fontFamily="Arial, Helvetica, sans-serif"
                    letterSpacing="0.4"
                >
                    {info.linea1}
                </text>

                {/* Texto Nutriente Crítico */}
                {!tieneDosLineas ? (
                    <text
                        x="50"
                        y="51"
                        fill="#ffffff"
                        fontSize={info.linea2[0].length > 9 ? '10' : '12'}
                        fontWeight="900"
                        textAnchor="middle"
                        fontFamily="Arial, Helvetica, sans-serif"
                        letterSpacing="0.3"
                    >
                        {info.linea2[0]}
                    </text>
                ) : (
                    <>
                        <text
                            x="50"
                            y="44"
                            fill="#ffffff"
                            fontSize="9.5"
                            fontWeight="900"
                            textAnchor="middle"
                            fontFamily="Arial, Helvetica, sans-serif"
                            letterSpacing="0.3"
                        >
                            {info.linea2[0]}
                        </text>
                        <text
                            x="50"
                            y="57"
                            fill="#ffffff"
                            fontSize="8.5"
                            fontWeight="900"
                            textAnchor="middle"
                            fontFamily="Arial, Helvetica, sans-serif"
                            letterSpacing="0.2"
                        >
                            {info.linea2[1]}
                        </text>
                    </>
                )}

                {/* Texto Ministerio de Salud al pie DENTRO del octógono */}
                <text
                    x="50"
                    y="80"
                    fill="#ffffff"
                    fontSize="5.5"
                    fontWeight="600"
                    textAnchor="middle"
                    fontFamily="Arial, Helvetica, sans-serif"
                >
                    Ministerio de Salud
                </text>
            </svg>
        </div>
    );
}
