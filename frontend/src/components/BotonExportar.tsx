import { useState, useRef, useEffect } from 'react';
import Boton from './Boton';
import { captureChartCanvas, exportToPNG, exportToPDF } from '../utils/exportar';
import styles from './BotonExportar.module.css';

interface Props {
    canvasId: string;
    filename?: string;
}

export default function BotonExportar({ canvasId, filename = 'grafico' }: Props) {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setMenuAbierto(false);
            }
        };

        if (menuAbierto) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuAbierto]);

    const handleExport = async (formato: 'png' | 'pdf') => {
        setMenuAbierto(false);
        const dataUrl = await captureChartCanvas(canvasId);
        if (!dataUrl) {
            alert('No se pudo capturar el gráfico.');
            return;
        }

        if (formato === 'png') {
            exportToPNG(dataUrl, `${filename}.png`);
        } else {
            exportToPDF(dataUrl, `${filename}.pdf`);
        }
    };

    return (
        <div className={styles.contenedor} ref={containerRef}>
            <Boton variant="descargar" onClick={() => setMenuAbierto(!menuAbierto)}>
                Descargar
            </Boton>

            {menuAbierto && (
                <div className={styles.menuOpciones}>
                    <button className={styles.opcionItem} onClick={() => handleExport('png')}>
                        <i className="bi bi-image" style={{ marginRight: '8px', color: '#3b82f6' }}></i> Descargar como PNG
                    </button>
                    <button className={styles.opcionItem} onClick={() => handleExport('pdf')}>
                        <i className="bi bi-file-earmark-pdf" style={{ marginRight: '8px', color: '#ef4444' }}></i> Descargar como PDF
                    </button>
                </div>
            )}
        </div>
    );
}
