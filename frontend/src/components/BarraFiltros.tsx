import Boton from './Boton';
import BuscadorTexto from './BuscadorTexto';
import styles from '../styles/shared.module.css';

export interface FiltroConfig {
    label: string;
    value: string;
    onChange: (valor: string) => void;
    type?: 'select' | 'date';
    opciones?: { value: string; label: string }[];
}

interface BarraFiltrosProps {
    busqueda?: string;
    onBusquedaChange?: (valor: string) => void;
    placeholderBusqueda?: string;
    onLimpiar: () => void;
    mostrarBotonLimpiar: boolean;
    filtros?: FiltroConfig[]; 
}

export default function BarraFiltros({
    busqueda,
    onBusquedaChange,
    placeholderBusqueda = "Buscar...",
    onLimpiar,
    mostrarBotonLimpiar,
    filtros = []
}: BarraFiltrosProps) {
    return (
        <div
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '15px',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                width: '100%',
                maxWidth: '1100px',
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: 'var(--card-bg, #444444)',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                boxSizing: 'border-box',
            }}
        >
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end', flexGrow: 1, width: '100%', maxWidth: '100%' }}>
                
                {onBusquedaChange && (
                    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: '200px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            Buscar:
                        </label>
                        <BuscadorTexto 
                            valor={busqueda || ''} 
                            onCambio={onBusquedaChange} 
                            placeholder={placeholderBusqueda} 
                            ancho="100%"
                        />
                    </div>
                )}

                {filtros.map((filtro, index) => (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: '150px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            {filtro.label}
                        </label>
                        
                        {filtro.type === 'date' ? (
                            <input
                                type="date"
                                value={filtro.value}
                                onChange={(e) => filtro.onChange(e.target.value)}
                                className={styles.filtroFecha}
                            />
                        ) : (
                            <select
                                value={filtro.value}
                                onChange={(e) => filtro.onChange(e.target.value)}
                                className={styles.filtroFecha}
                            >
                                {filtro.opciones?.map((op, i) => (
                                    <option key={i} value={op.value}>
                                        {op.label}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                ))}
            </div>

            <div style={{ alignSelf: 'flex-end', marginTop: '10px' }}>
                <Boton
                    variant="limpiar"
                    onClick={onLimpiar}
                    disabled={!mostrarBotonLimpiar}
                >
                    Limpiar Filtros
                </Boton>
            </div>
        </div>
    );
}
