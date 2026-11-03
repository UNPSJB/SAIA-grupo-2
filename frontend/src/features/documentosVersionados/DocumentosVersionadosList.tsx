import { useEffect, useState } from 'react';
import type { DocumentoVersionado } from '../../types/documentosVersionados';
import { ETIQUETAS_TIPO } from './tipoDocumentoVersionado';
import { getDocumentosVersionados} from '../../services/documentosVersionadosServices';

import styles from '../../styles/shared.module.css';

import { useAuth } from '../../context/AuthContext';
import TablaPaginada,{ type Columna } from '../../components/TablaPaginada';
import Boton from '../../components/Boton';
import BuscadorTexto from '../../components/BuscadorTexto';
import { filtrarPorTexto } from '../../utils/texto';
import { abrirArchivoEnPestania } from '../../utils/archivos';
import BotonHistorialVersiones from './BotonHistorialVersiones';
import NuevaVersionModal from './NuevaVersionModal';
import { Link } from 'react-router-dom';
import EncabezadoPagina from '../../components/EncabezadoPagina';




export default function DocumentosVersionadosList(){
    const [documentosVersionados, setDocumentosVersionados] = useState <DocumentoVersionado[]>([]);
    // Este segundo es para apertura de modal
    const [documentoSeleccionado, setDocumentoSeleccionado] = useState<DocumentoVersionado | null>(null);


    const [busqueda, setBusqueda] = useState('');
    const { usuario } = useAuth();
    const [error, setError] = useState<string | null>(null);

    const ordenarDocumentos = (data: DocumentoVersionado[]) => data.toSorted((a, b) => {
        if (a.nombre === b.nombre) return 0;
        return a.nombre ? -1 : 1;
    });

    const cargarDatos = async () => {
        try {
            const data = await getDocumentosVersionados();
            setError(null);
            setDocumentosVersionados(ordenarDocumentos(data));
        } catch (problema) {
            console.error("Error al cargar documentos versionados:", problema);
            setError(
                problema instanceof Error
                    ? problema.message
                    : 'No se pudieron cargar los documentos versionados.'
            );
        }
    };

    useEffect(() => {
        let montado = true;
        getDocumentosVersionados()
            .then((data) => {
                if (!montado) return;
                setError(null);
                setDocumentosVersionados(ordenarDocumentos(data));
            })
            .catch((problema: unknown) => {
                if (!montado) return;
                console.error("Error al cargar documentos versionados:", problema);
                setError(
                    problema instanceof Error
                        ? problema.message
                        : 'No se pudieron cargar los documentos versionados.'
                );
            });

        return () => {
            montado = false;
        };
    }, []);

        const handleVisualizar = (documento: DocumentoVersionado) => {
            if (!documento.version_vigente?.version_documento_url) return;
            abrirArchivoEnPestania(documento.version_vigente.version_documento_url, documento.version_vigente.archivo_nombre);
        };

        const documentosVersionadosFiltrados = filtrarPorTexto(documentosVersionados, busqueda);
        const columnaDocumentoVersionado = (
            key: string,
            encabezado: string,
            opciones: Omit<Columna<DocumentoVersionado>, 'key' | 'encabezado'> = {}
        ): Columna<DocumentoVersionado> => ({ key, encabezado, ...opciones });

        const misColumnas: Columna<DocumentoVersionado>[] =[
            columnaDocumentoVersionado('nombre','Nombre',{
                ordenable:true,
                variant:'titulo',
            }),
            columnaDocumentoVersionado('tipo','Tipo de documento',{
                ordenable:true,
                variant:'badge',
                valorOrdenamiento: (doc) => ETIQUETAS_TIPO[doc.tipo],
                render: (doc) => ETIQUETAS_TIPO[doc.tipo], // con render para mostrar "Manual de BPM" en vez de "manual_bpm" (nombre interno)
            }),
            columnaDocumentoVersionado('acciones', 'Acciones',{
                render: (doc) =>(
                    <div className={styles.grupoBotonesTabla}>

                        {usuario?.rol === 'admin' &&(
                            <Boton 
                                variant="guardar"
                                title="Subir nueva versión"
                                onClick={() => setDocumentoSeleccionado(doc)}
                            />
                        )}

                        <Boton
                            variant="ver"
                            onClick={() => handleVisualizar(doc)}
                            title="Visualizar documento en una pestaña nueva"
                        />

                        {usuario?.rol === 'admin' &&(
                            <BotonHistorialVersiones
                                documentoId={doc.id}
                                documentoNombre={doc.nombre}
                                onVersionVigenteCambiada={() => {
                                    void cargarDatos();
                                }}
                            />
                        )}
                        
                    </div>
                )
            })
        ];

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Gestión de Documentos Versionados"
                descripcion="Administra los documentos versionados, incluyendo procedimientos, manuales y otros archivos importantes."
                acciones={usuario?.rol === 'admin' && (
                    <Link to="/documentos/nuevo">
                        <Boton variant="crear">Registrar Documento Versionado</Boton>
                    </Link>
                )}
            />

            <div className={styles.filaBotonesSuperiores}>
                <BuscadorTexto valor={busqueda} onCambio={setBusqueda} placeholder="Buscar por nombre..." />
            </div>
            
            {error && <p style={{ color: 'var(--rojo-texto)' }}>{error}</p>}

            <TablaPaginada
                datos={documentosVersionadosFiltrados}
                columnas={misColumnas}
                gridTemplateColumns="2fr 1fr 1fr"
                itemsPorPagina={5}
                mensajeVacio="No hay documentos versionados registrados."
                columnaOrdenInicial="nombre"
                ordenAscInicial={false}
            />

            {documentoSeleccionado && (
                <NuevaVersionModal
                    documentoId={documentoSeleccionado.id}
                    documentoNombre={documentoSeleccionado.nombre}
                    onClose={() => setDocumentoSeleccionado(null)}
                    onVersionCreada={() => {
                        void cargarDatos();
                    }}
                />
            )}

        </div>        
    )
}