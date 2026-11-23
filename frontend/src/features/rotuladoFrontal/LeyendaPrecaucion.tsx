import type { SelloAdvertencia } from '../../types/parametrosNormativos';

interface Props {
    sello: SelloAdvertencia | string;
    texto?: string;
    tamano?: 'normal' | 'pequeno';
}

const TEXTOS_POR_DEFECTO: Record<string, string> = {
    contiene_edulcorantes: 'CONTIENE EDULCORANTES, NO RECOMENDABLE EN NIÑOS/AS.',
    contiene_cafeina: 'CONTIENE CAFEÍNA. EVITAR EN NIÑOS/AS.',
};

function partirLeyenda(texto: string): { linea1: string; linea2: string } {
    const corte = texto.search(/[,.;]\s/);
    if (corte === -1) return { linea1: texto, linea2: '' };
    return { linea1: texto.slice(0, corte + 1), linea2: texto.slice(corte + 2).trim() };
}

export default function LeyendaPrecaucion({ sello, texto, tamano = 'normal' }: Props) {
    const info = partirLeyenda((texto?.trim() || TEXTOS_POR_DEFECTO[sello] || sello.replace(/_/g, ' ')).toUpperCase());

    const esPequeno = tamano === 'pequeno';
    const ancho = esPequeno ? 220 : 310;
    const alto = esPequeno ? 55 : 72;

    return (
        <div style={{ display: 'inline-block', margin: '6px', verticalAlign: 'top' }}>
            <svg
                width={ancho}
                height={alto}
                viewBox="0 0 280 65"
                style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))' }}
            >
                <rect x="2" y="2" width="276" height="61" fill="#000000" stroke="#ffffff" strokeWidth="2.5" rx="1" />
                <rect x="5" y="5" width="270" height="55" fill="none" stroke="#ffffff" strokeWidth="1.2" rx="1" />

                <text
                    x="140"
                    y="24"
                    fill="#ffffff"
                    fontSize="11.5"
                    fontWeight="900"
                    textAnchor="middle"
                    fontFamily="Arial, Helvetica, sans-serif"
                    letterSpacing="0.2"
                >
                    {info.linea1}
                </text>

                {info.linea2 && (
                    <text
                        x="140"
                        y="39"
                        fill="#ffffff"
                        fontSize="11.5"
                        fontWeight="900"
                        textAnchor="middle"
                        fontFamily="Arial, Helvetica, sans-serif"
                        letterSpacing="0.2"
                    >
                        {info.linea2}
                    </text>
                )}

                <text
                    x="140"
                    y="53"
                    fill="#ffffff"
                    fontSize="6.5"
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
