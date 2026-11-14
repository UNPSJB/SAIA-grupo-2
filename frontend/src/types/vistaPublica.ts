export interface ConfiguracionVistaPublica {
  id: number;
  activa: boolean;
  fecha_activacion: string | null;
  token: string | null;
  mostrar_cumplimiento_limpieza: boolean;
  mostrar_equipos_calibrados: boolean;
  mostrar_capacitaciones: boolean;
}

export interface ItemSeriePublica {
  periodo: string;
  porcentaje: number | null;
}

export interface VistaPublicaResumen {
  activa: boolean;
  fecha_actualizacion: string;
  porcentaje_cumplimiento_limpieza: number | null;
  porcentaje_equipos_al_dia: number | null;
  serie_cumplimiento: ItemSeriePublica[];
}
