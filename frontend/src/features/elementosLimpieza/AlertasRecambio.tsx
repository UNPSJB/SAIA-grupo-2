import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { ElementoLimpieza } from '../../types/elementosLimpieza';
import { getAlertasRecambio, registrarRecambio } from '../../services/elementosLimpiezaServices';
import { COLOR_ESTADO, ETIQUETA_ESTADO, textoRecambio } from './estadoRecambio';
import Boton from '../../components/Boton';
import ModalAlerta from '../../components/alerta';
import styles from '../../styles/shared.module.css';

import BuscadorTexto from '../../components/BuscadorTexto';
import { filtrarPorTexto } from '../../utils/texto';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';


export default function AlertasRecambio() {
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === 'admin';

    const [alertas, setAlertas] = useState<ElementoLimpieza[]>([]);

    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(true);
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });

    const cargarAlertas = async () => {
        try {
            const data = await getAlertasRecambio();
            setAlertas(data);
        } catch (error) {
            console.error("Error al cargar las alertas de recambio:", error);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarAlertas();
    }, []);

    const handleRecambio = async (elemento: ElementoLimpieza) => {
        const exito = await registrarRecambio(String(elemento.id));
        if (exito) {
            cargarAlertas();
        } else {
            setModalAlerta({
                isOpen: true,
                titulo: 'Error',
                mensaje: 'Hubo un error al registrar el recambio.'
            });
        }
    };

    const vencidos = alertas.filter(a => a.estado_recambio === 'vencido').length;
    const proximos = alertas.filter(a => a.estado_recambio === 'proximo').length;

    const alertasFiltradas = filtrarPorTexto(alertas, busqueda, (c) => [c.nombre]);

    const misColumnas: Columna<ElementoLimpieza>[] = [
        {
            key: 'nombre',
            encabezado: 'Elemento',
            ordenable: true,
            render: (el) => <span style={{ fontWeight: '500', color: 'var(--text-h)' }}>{el.nombre}</span>
        },
        {
            key: 'estado_recambio',
            encabezado: 'Estado',
            ordenable: true,
            valorOrdenamiento: (el) => (el.estado_recambio as string) === 'sin_control' ? 'zzz' : ETIQUETA_ESTADO[el.estado_recambio],
            variant: (el) => el.estado_recambio ? `estado_${el.estado_recambio}` : '',
            render: (el) => el.estado_recambio ? ETIQUETA_ESTADO[el.estado_recambio] : 'Sin asignar'
        },
        {
            key: 'vencimiento',
            encabezado: 'Vencimiento',
            ordenable: true,
            valorOrdenamiento: (el) => textoRecambio(el),
            render: (el) => <span style={{ fontSize: '0.85rem' }}>{textoRecambio(el)}</span>
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            render: (el) => (
                <div className={styles.grupoBotonesTabla}>
                    {esAdmin && (
                        <Boton variant="guardar" onClick={() => handleRecambio(el)}>
                            Registrar recambio
                        </Boton>
                    )}
                </div>
            )
        }
    ];


    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Alertas de Recambio</h2>


            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: '1100px', marginBottom: '16px' }}>
                <BuscadorTexto valor={busqueda} onCambio={setBusqueda} placeholder="Buscar elemento..." />
            </div>
            {!cargando && alertas.length > 0 && (
                <p style={{ marginTop: '-10px', marginBottom: '20px' }}>
                    <span style={{ color: COLOR_ESTADO.vencido, fontWeight: 'bold' }}>{vencidos} vencidos</span>
                    {' · '}
                    <span style={{ color: COLOR_ESTADO.proximo, fontWeight: 'bold' }}>{proximos} próximos a vencer</span>
                </p>
            )}

            {esAdmin && (
                <Link to="/elementosLimpieza" className={styles.linkCrear}>
                    <Boton variant="volver">
                        Ver todos los elementos
                    </Boton>
                </Link>
            )}



            <TablaPaginada
                        datos={alertasFiltradas}
                        columnas={misColumnas}
                        gridTemplateColumns="2fr 1.3fr 1.5fr 1.2fr"
                        itemsPorPagina={10}
                        mensajeVacio="No hay elementos vencidos ni próximos a vencer."
                        columnaOrdenInicial="estado_recambio"
                        ordenAscInicial={false} // Para que muestre los 'vencidos' (rojo) primero, si es necesario ajustar.
            />


            <ModalAlerta
                isOpen={modalAlerta.isOpen}
                titulo={modalAlerta.titulo}
                mensaje={modalAlerta.mensaje}
                onClose={() => setModalAlerta({ ...modalAlerta, isOpen: false })}
            />
        </div>
    );
}
