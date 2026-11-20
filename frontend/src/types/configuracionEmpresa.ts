export interface ConfiguracionEmpresa {
  id: number;
  nombre_empresa: string;
  cuit: string;
  domicilio: string;
  telefono: string;
  email: string;
  logo_base64: string | null;
}
