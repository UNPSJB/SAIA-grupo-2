export interface ConfiguracionVistaPublica {
  id: number;
  nombre: string;
  activa: boolean;
  fecha_activacion: string | null;
  token: string | null;
  mostrar_cumplimiento_limpieza: boolean;
  mostrar_equipos_calibrados: boolean;
  mostrar_capacitaciones: boolean;
  mostrar_poes_vigentes: boolean;
  mostrar_trazabilidad_lotes: boolean;
  titulo_publico: string | null;
  presentacion: string | null;
  contacto: string | null;
}

export interface ItemSeriePublica {
  periodo: string;
  porcentaje: number | null;
}

export interface VistaPublicaResumen {
  activa: boolean;
  nombre: string;
  fecha_actualizacion: string;
  mostrar_cumplimiento_limpieza: boolean;
  mostrar_equipos_calibrados: boolean;
  mostrar_capacitaciones: boolean;
  mostrar_poes_vigentes: boolean;
  mostrar_trazabilidad_lotes: boolean;
  titulo_publico: string | null;
  presentacion: string | null;
  contacto: string | null;
  porcentaje_cumplimiento_limpieza: number | null;
  porcentaje_equipos_al_dia: number | null;
  porcentaje_personal_capacitado: number | null;
  porcentaje_poes_vigentes: number | null;
  porcentaje_lotes_trazables: number | null;
  serie_cumplimiento: ItemSeriePublica[];
}

export interface ConfiguracionVistaPublicaPayload {
  nombre?: string;
  activa?: boolean;
  mostrar_cumplimiento_limpieza?: boolean;
  mostrar_equipos_calibrados?: boolean;
  mostrar_capacitaciones?: boolean;
  mostrar_poes_vigentes?: boolean;
  mostrar_trazabilidad_lotes?: boolean;
  titulo_publico?: string;
  presentacion?: string;
  contacto?: string;
}
