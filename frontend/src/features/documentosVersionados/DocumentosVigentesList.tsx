import { useEffect, useState, useMemo } from 'react';
import type { DocumentoVersionado } from '../../types/documentosVersionados';
import { getDocumentosVigentes } from '../../services/documentosVersionadosServices';
import { abrirArchivoEnPestania } from '../../utils/archivos';
import { filtrarPorTexto } from '../../utils/texto';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';
import BuscadorTexto from '../../components/BuscadorTexto';
import Boton from '../../components/Boton';
import sharedStyles from '../../styles/shared.module.css';


 import BotonHistorialVersiones from './BotonHistorialVersiones';

import { useAuth } from '../../context/AuthContext';

const ETIQUETAS_TIPO: Record<string, string> = {
    manual_bpm: 'Manual de BPM',
    ficha_tecnica: 'Ficha Técnica',
    procedimiento: 'Procedimiento Operativo (POES)',
    receta: 'Receta de Elaboración',
};

export default function DocumentosVigentesList() {
    const [documentos, setDocumentos] = useState<DocumentoVersionado[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState<string>('');

    const cargarDocumentos = async () => {
        setCargando(true);
        setError(null);
        try {
            const data = await getDocumentosVigentes();
            setDocumentos(data);
        } catch (err: any) {
            setError(err?.message || 'Error al cargar los procedimientos vigentes.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDocumentos();
    }, []);


    // si si habia que filtrar para que el operario solo vea los documentos de los sectores de los 
    // que esta asignado descmoentar esto. hay otra parte para descomentar en el services.py del backendn
    //
    // const { usuario } = useAuth();
    // const documentosPorSector = useMemo(() => {
    //     if (usuario?.rol === 'operario' && usuario?.sectores_ids) {
    //         return documentos.filter(doc => usuario.sectores_ids.includes(doc.sector_id));
    //     }
    //     return documentos;
    // }, [documentos, usuario]);



    const documentosFiltrados = useMemo(() => {
            // Si se activa el filtro por sectores, filtrar sobre 'documentosPorSector' en lugar de 'documentos':
        return filtrarPorTexto(documentos, busqueda);
    }, [documentos, busqueda]);

    const handleAbrirArchivo = (doc: DocumentoVersionado) => {
        if (!doc.version_vigente?.version_documento_url) return;
        abrirArchivoEnPestania(
            doc.version_vigente.version_documento_url,
            doc.version_vigente.archivo_nombre || `${doc.nombre}_vigente.pdf`
        );
    };

    const columnas: Columna<DocumentoVersionado>[] = [
        {
            key: 'nombre',
            encabezado: 'Procedimiento / Documento',
            ordenable: true,
            render: (doc) => (
                <div>
                    <strong>{doc.nombre}</strong>
                    <div className={sharedStyles.textMuted}>
                        {ETIQUETAS_TIPO[doc.tipo] || doc.tipo}
                    </div>
                </div>
            ),
        },
        {
            key: 'version_vigente',
            encabezado: 'Versión Vigente',
            render: (doc) => {
                const v = doc.version_vigente;
                if (!v) return null;
                return (
                    <div>
                        <strong className={sharedStyles.textSuccess}>v{v.version} (Oficial)</strong>
                        {v.fecha_vigencia && (
                            <div className={sharedStyles.textMuted}>
                                Rige desde: {v.fecha_vigencia}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'acciones',
            encabezado: 'Acceso Directo',
            variant: 'acciones',
            render: (doc) => (
                <div>
                <Boton
                    variant="ver"
                    onClick={() => handleAbrirArchivo(doc)}
                    title={`Abrir versión vigente de ${doc.nombre}`}
                >
                    Ver Procedimiento
                </Boton>

                <BotonHistorialVersiones 
                documentoId={doc.id} 
                documentoNombre={doc.nombre} 
               // onVersionVigenteCambiada={handleRecargarDocumento}
                />
                  
                
                </div>
            ),
        },
    ];

    return (
        <div className={sharedStyles.contenedorPrincipal}>
            <div className={sharedStyles.cabeceraLista}>
                <div>
                    <h1 className={sharedStyles.tituloPrincipal}>Procedimientos y Manuales Vigentes</h1>
                    <p className={sharedStyles.textMuted}>
                        Consulta de documentos oficiales vigentes para tareas de planta
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: '1100px', marginBottom: '16px' }}>
                <BuscadorTexto valor={busqueda} onCambio={setBusqueda} placeholder="Buscar procedimiento..." />
            </div>
            

     
            {error && (
                <div className={sharedStyles.textDanger}>
                    {error}
                </div>
            )}


           
            {cargando ? (
                <div className={sharedStyles.emptyMensaje}>
                    Cargando procedimientos vigentes...
                </div>
            ) : (

                <TablaPaginada
                    datos={documentosFiltrados}
                    columnas={columnas}
                    gridTemplateColumns="2.5fr 1.5fr 1.5fr"
                    itemsPorPagina={10}
                    mensajeVacio="No se encontraron procedimientos vigentes disponibles."
                />
            )}

           
            
        </div>
    );
}