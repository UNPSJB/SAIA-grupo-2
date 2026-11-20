export interface ClaseFuncionalAditivo {
  id: number;
  nombre: string;
  necesita_ins: boolean;
}

export interface Aditivo {
  id: number;
  nombre_completo: string;
  clase_funcional_id: number;
  numero_ins: string | null;
  clase_funcional?: ClaseFuncionalAditivo;
}
