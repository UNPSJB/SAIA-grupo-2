import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { AlertaVencimiento } from '../../types/documentacion';
import { getAlertasDocumentacion } from '../../services/documentacionServices';
import { COLOR_ESTADO, ETIQUETA_ESTADO, ETIQUETA_TIPO, textoVencimiento } from './estadoVencimiento';
import Boton from '../../components/Boton';
import ModalAlerta from '../../components/alerta';
import styles from '../../styles/shared.module.css';

interface alertasPorEmpleado{
    empleado:{
        id: number;
        legajo: string;
        nombre: string;
        apellido: string;
    };
    documentos: AlertaVencimiento[];
}


export default function AlertasDocumentacion(){
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === 'admin';

    const [alertas, setAlertas] = useState<AlertaVencimiento[]>([]);
    const [cargando, setCargando] = useState(true);
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: ''});

    const cargarAlertas = async () => {
        try{
            const data = await getAlertasDocumentacion();
            setAlertas(data);
        } catch (error) {
            console.error("Error al cargar las alertas de vencimiento:", error);
        } finally{
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarAlertas();
    }, []);


    const alertasAgrupadas: alertasPorEmpleado[] = Object.values(
        alertas.reduce((acc, current) => {
            const empId = current.empleado.id;
            if (!acc[empId]) {
                acc[empId] = {
                    empleado: current.empleado,
                    documentos: []
                };
            }
            acc[empId].documentos.push(current);
            return acc;
        },  {} as Record<number, alertasPorEmpleado>)
    );
    const vencidos = alertas.filter(a => a.estado === 'vencido').length;
    const proximos = alertas.filter(a => a.estado === 'proximo').length;

    return (
        <div className={styles.contenedorPrincipal}>
            <h2> Alertas de Vencimiento de Documentación</h2>

            {!cargando && alertas.length > 0 && (
                <p style={{ marginTop: '-10px', marginBottom: '20px' }}>
                    <span style={{ color: COLOR_ESTADO.vencido, fontWeight: 'bold' }}>{vencidos} vencidos</span>
                    {' · '}
                    <span style={{ color: COLOR_ESTADO.proximo, fontWeight: 'bold' }}>{proximos} próximos a vencer</span>
                </p>
            )}

            {esAdmin && (
                <Link to="/empleados" className={styles.linkCrear}>
                    <Boton variant="volver">
                        Ver todos los empleados
                    </Boton>
                </Link>
            )}

            <div className={styles.contenedorTabla} style={{ maxWidth: '900px'}}>
                <div className={styles.filaHeader} style={{ gridTemplateColumns: '2fr 1.3fr 1.5fr 1.2fr'}}>
                    <div>Empleado / Legajo</div>
                    <div>Documentación</div>
                    <div>Vencimiento</div>
                    <div>Acciones</div>
                </div>
                
                  
                {alertasAgrupadas.map((grupo) =>(
                    <div key={grupo.empleado.id} className={styles.filaItem} style={{ gridTemplateColumns: '2fr 1.3fr 1.5fr 1.2fr', alignItems: 'center'}}>
                        <div style={{ fontWeight: '500', color: 'var(--text-h)' }}>
                            {grupo.empleado.apellido}, {grupo.empleado.nombre}
                            <div style={{ fontSize: '0.85rem', fontWeight: 'normal', color: 'var(--text-muted)', marginTop: '2px'}}>
                                (Leg. {grupo.empleado.legajo})
                            </div>          
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {grupo.documentos.map((doc) => (
                                <div key={doc.id} style={{ fontSize: '0.9rem', height: '35px', display: 'flex', alignItems: 'center'}}>
                                    {ETIQUETA_TIPO[doc.tipo] || doc.tipo}
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {grupo.documentos.map((doc) =>(
                                <div key={doc.id} style={{ height: '35px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: COLOR_ESTADO[doc.estado] }}>
                                        {ETIQUETA_ESTADO[doc.estado]}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {textoVencimiento(doc.dias_restantes)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className={styles.grupoBotonesTabla} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {grupo.documentos.map((doc) => (
                                <div key={doc.id} style={{ height: '60px', display: 'flex', alignItems: 'center' }}>
                                    {esAdmin && (
                                        <Link to={`/empleados/${grupo.empleado.id}/documentacion/editar/${doc.id}`}>
                                            <Boton variant="guardar">
                                                Renovar documentación
                                            </Boton>
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
  
                ))}
                    
                {!cargando && alertas.length === 0 && (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text)' }}>
                        No hay documentación vencida y próxima a vencer.
                    </div>
                )}

                {cargando && (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text)' }}>
                        Cargando alertas...
                    </div>
                )}
            </div>

            <ModalAlerta
                isOpen={modalAlerta.isOpen}
                titulo={modalAlerta.titulo}
                mensaje={modalAlerta.mensaje}
                onClose={() => setModalAlerta({ ...modalAlerta, isOpen: false})}
            />
        </div>

    );
}