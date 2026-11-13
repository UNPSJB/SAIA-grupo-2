export interface ConfiguracionVistaPublica {
  id: number;
  activa: boolean;
  fecha_activacion: string | null;
  token: string | null;
  mostrar_cumplimiento_limpieza: boolean;
  mostrar_equipos_calibrados: boolean;
  mostrar_capacitaciones: boolean;
}
