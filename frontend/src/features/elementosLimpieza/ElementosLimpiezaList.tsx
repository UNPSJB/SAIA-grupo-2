import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { ElementoLimpieza } from '../../types/elementosLimpieza';
import { getElementosLimpieza, registrarRecambio } from '../../services/elementosLimpiezaServices';
import { COLOR_ESTADO, ETIQUETA_ESTADO, textoRecambio } from './estadoRecambio';
import Boton from '../../components/Boton';
import ModalAlerta from '../../components/alerta';
import styles from '../../styles/shared.module.css';

import BuscadorTexto from '../../components/BuscadorTexto';
import { filtrarPorTexto } from '../../utils/texto';

import TablaPaginada, { type Columna } from '../../components/TablaPaginada';

export default function ElementosLimpiezaList() {
    const [elementos, setElementos] = useState<ElementoLimpieza[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });
    const elementosPorPagina = 10;

    const cargarDatos = async () => {
        try {
            const data = await getElementosLimpieza();
            setElementos(data);
        } catch (error) {
            console.error("Error al cargar elementos de limpieza:", error);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const handleRecambio = async (elemento: ElementoLimpieza) => {
        const exito = await registrarRecambio(String(elemento.id));
        if (exito) {
            cargarDatos();
        } else {
            setModalAlerta({
                isOpen: true,
                titulo: 'Error',
                mensaje: 'Hubo un error al registrar el recambio.'
            });
        }
    };
    const elementosFiltrados = filtrarPorTexto(elementos, busqueda, (c) => [c.nombre]);

    const indiceUltimo = paginaActual * elementosPorPagina;
    const indicePrimer = indiceUltimo - elementosPorPagina;
    const elementosActuales = elementosFiltrados.slice(indicePrimer, indiceUltimo);
    const totalPaginas = Math.ceil(elementosFiltrados.length / elementosPorPagina);

    const conAlerta = elementos.filter(
        e => e.estado_recambio === 'vencido' || e.estado_recambio === 'proximo'
    ).length;

    const misColumnas: Columna<ElementoLimpieza>[] = [
        {
            key: 'nombre',
            encabezado: 'Nombre',
            ordenable: true,
            render: (el) => <span style={{ fontWeight: '500', color: 'var(--text-h)' }}>{el.nombre}</span>
        },
        {
            key: 'frecuencia_recambio_dias',
            encabezado: 'Frecuencia',
            ordenable: true,
            render: (el) => (
                <span style={{ fontSize: '0.85rem' }}>
                    {el.frecuencia_recambio_dias !== null
                        ? `Cada ${el.frecuencia_recambio_dias} días`
                        : <span style={{ opacity: 0.6 }}>No definida</span>}
                </span>
            )
        },
        {
            key: 'estado_recambio',
            encabezado: 'Estado',
            ordenable: true,
            valorOrdenamiento: (el) => (el.estado_recambio as string) === 'sin_control' ? 'zzz' : ETIQUETA_ESTADO[el.estado_recambio],
            variant: (el) => `estado_${el.estado_recambio}`,
            render: (el) =>  ETIQUETA_ESTADO[el.estado_recambio] 
                
        },
        {
            key: 'vencimiento',
            encabezado: 'Vencimiento',
            ordenable: true,
            //pobre con 9999 y funcionaba probe con "a" de onda y parece que funciona mejor, nose, a testar a futuro supongo
            valorOrdenamiento: (el) => el.dias_restantes? el.dias_restantes: `a`, 
            render: (el) => <span style={{ fontSize: '0.85rem' }}>{textoRecambio(el)}</span>
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            render: (el) => (
                <div className={styles.grupoBotonesTabla}>
                    {el.frecuencia_recambio_dias !== null && (
                        <Boton
                            variant="guardar"
                            style={{ padding: '8px 12px' }}
                            onClick={() => handleRecambio(el)}
                            title="Registrar recambio"
                        />
                    )}
                    <Link to={`/elementosLimpieza/editar/${el.id}`} title="Editar elemento">
                        <Boton variant="editar" style={{ padding: '8px 12px' }} />
                    </Link>
                    <Link to={`/elementosLimpieza/${el.id}`} title="Ver detalle">
                        <Boton variant="ver" style={{ padding: '8px 12px' }} />
                    </Link>
                    <Link to={`/elementosLimpieza/eliminar/${el.id}`} title="Eliminar registro">
                        <Boton variant="eliminar" style={{ padding: '8px 12px' }} />
                    </Link>
                </div>
            )
        }
    ];


    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Elementos de Limpieza</h2>


            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: '1100px', marginBottom: '16px' }}>
                <BuscadorTexto valor={busqueda} onCambio={setBusqueda} placeholder="Buscar elemento..." />
            </div>
            {conAlerta > 0 && (
                <p style={{ marginTop: '-10px', marginBottom: '20px', color: COLOR_ESTADO.vencido, fontWeight: 'bold' }}>
                    {conAlerta} {conAlerta === 1 ? 'elemento requiere' : 'elementos requieren'} atención
                </p>
            )}

            <div className={styles.filaBotones} style={{ justifyContent: 'center', marginBottom: '20px' }}>
                <Link to="/elementosLimpieza/nuevo">
                    <Boton variant="crear">Registrar Elemento</Boton>
                </Link>
                <Link to="/elementosLimpieza/alertas">
                    <Boton variant="ver">Ver Alertas de Recambio</Boton>
                </Link>
            </div>


            <div style={{ maxWidth: '1000px', width: '100%' }}>
                <TablaPaginada
                    datos={elementosFiltrados}
                    columnas={misColumnas}
                    gridTemplateColumns="2fr 1.2fr 1.2fr 1.4fr 1.6fr"
                    itemsPorPagina={10}
                    mensajeVacio="No hay elementos de limpieza registrados."
                    columnaOrdenInicial="nombre"
                />
            </div>


            {totalPaginas > 1 && (
                <div className={styles.filaBotones} style={{ alignItems: 'center', marginTop: '30px', justifyContent: 'center' }}>
                    <Boton variant="volver" onClick={() => setPaginaActual(p => p - 1)} disabled={paginaActual === 1}>
                        Anterior
                    </Boton>
                    <span style={{ color: 'var(--text-h)', fontWeight: 'bold', margin: '0 15px' }}>
                        Página {paginaActual} de {totalPaginas}
                    </span>
                    <Boton variant="siguiente" onClick={() => setPaginaActual(p => p + 1)} disabled={paginaActual === totalPaginas}>
                        Siguiente
                    </Boton>
                </div>
            )}

            <ModalAlerta
                isOpen={modalAlerta.isOpen}
                titulo={modalAlerta.titulo}
                mensaje={modalAlerta.mensaje}
                onClose={() => setModalAlerta({ ...modalAlerta, isOpen: false })}
            />
        </div>
    );
}
