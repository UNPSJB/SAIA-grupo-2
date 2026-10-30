export type TipoDocumentoVersionado = 'manual_bpm' | 'ficha_tecnica' | 'procedimiento' | 'receta';
export interface EmpleadoResumen {
    id: number;
    legajo: string;
    nombre: string;
    apellido: string;
}
export interface VersionDocumento {
    documentos_versionados_id: number;
    version: number;
    version_documento_url: string;
    estado?: 'activo' | 'archivado' | string;
    fecha_vigencia?: string | null;
    fecha_subida?: string | null;
    fecha_modificacion?: string | null;
    subido_por_id?: number | null;
    subido_por?: EmpleadoResumen | null;
    modificado_por_id?: number | null;
    modificado_por?: EmpleadoResumen | null;
    archivo_nombre?: string | null;
}
export interface DocumentoVersionado {
    id: number;
    nombre: string;
    tipo: TipoDocumentoVersionado;
    version_vigente?: VersionDocumento | null;
}
export interface DocumentoVersionadoCreate {
    nombre: string;
    tipo: TipoDocumentoVersionado;
    version_inicial_url: string;
    archivo_nombre?: string;
    fecha_vigencia?: string;
}
export interface VersionDocumentoCreate {
    documentos_versionados_id: number;
    version_documento_url: string;
    archivo_nombre?: string;
    fecha_vigencia?: string;
}