import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
//import type { Capacidad } from '../../types/capacidades';
import type { UnidadMedida } from '../../types/unidadesMedida';
import type { InsumoPayload } from '../../types/insumos';
//import { getCapacidades } from '../../services/capacidadesServices';
import { getUnidadesMedida } from '../../services/unidadesMedidaServices';
import { getInsumoById, saveInsumo } from '../../services/insumosServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function InsumoForm() {
    const [nombre, setNombre] = useState('');
    const [unidadesDisponibles, setUnidadesDisponibles] = useState<UnidadMedida[]>([]);
    const [unidadMedidaId, setUnidadMedidaId] = useState<number | ''>('');
    //no va a dejar crear hasta que no se conecte con unidades de medida
    //const [capacidadesDisponibles, setCapacidadesDisponibles] = useState<Capacidad[]>([]);
    //const [listaCapacidades, setListaCapacidades] = useState<number[]>([]);
    
    const navigate = useNavigate();
    const { id } = useParams();
    const editando = Boolean(id);

    useEffect(() => {
        const cargarUnidades = async () => {
            try {
                const data = await getUnidadesMedida();
                setUnidadesDisponibles(data);
            } catch (err) {
                console.error("Error al cargar unidades de medida:", err);
            }
        };
        cargarUnidades(); 
    }, []);
/*     useEffect(() => {
        const cargarCapacidades = async () => {
            try {
                const data = await getCapacidades();
                setCapacidadesDisponibles(data);
            } catch (err) {
                console.error("Error al cargar capacidades:", err);
            }
        };
        cargarCapacidades(); 
    }, []);*/

    useEffect(() => {
        if (editando && id) {
            const cargarInsumo = async () => {
                try {
                    const data = await getInsumoById(id);
                    setNombre(data.nombre);
                    setUnidadMedidaId(data.unidad_medida_id)
                    /* if (data.capacidades) {
                        setListaCapacidades(data.capacidades.map((c) => c.id));
                    } */
                } catch (err) {
                    console.error("Error al cargar insumo:", err);
                }
            };
            cargarInsumo();
        }
    }, [id, editando]);

    // const handleCheckboxChange = (capId: number) => {
    //     setListaCapacidades(prev => 
    //         prev.includes(capId) 
    //             ? prev.filter(capacidadId => capacidadId !== capId)
    //             : [...prev, capId]
    //     );
    // };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (unidadMedidaId === '') {
            alert('Por favor, selecciona una unidad de medida.');
            return;
        }

        const datos: InsumoPayload = { 
            nombre, 
            unidad_medida_id:Number(unidadMedidaId)
            //listaCapacidades: listaCapacidades.length > 0 ? listaCapacidades : null 
        };

        try {
            const exito = await saveInsumo(datos, id);
            if (exito) {
                navigate('/insumos');
            } else {
                alert('Hubo un error al guardar el registro.');
            }
        } catch (error) {
            console.error('Error de red:', error);
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>{editando ? 'Editar Insumo' : 'Crer Nuevo Registro'}</h2>
            
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Nombre:</label>
                    <input 
                        type="text" 
                        value={nombre} 
                        onChange={(e) => setNombre(e.target.value)} 
                        required 
                    />
                </div>
                
                <div>
                    <label>Unidad de Medida:</label>
                    <select 
                        value={unidadMedidaId} 
                        onChange={(e) => setUnidadMedidaId(Number(e.target.value))}
                        required
                    >
                        <option value="" disabled>Seleccione una unidad...</option>
                        {unidadesDisponibles.map(unidad => (
                            <option key={unidad.id} value={unidad.id}>
                                {unidad.nombre}
                            </option>
                        ))}
                    </select>
                </div>


                {/* <div className={styles.bloqueCapacidades}>
                    <label>Capacidades (Opcional):</label>
                    <div className={styles.listaCheckboxes}>
                        {capacidadesDisponibles.map(cap => (
                            <div key={cap.id} className={styles.filaCheckbox}>
                                <input 
                                    type="checkbox" 
                                    id={`cap-${cap.id}`}
                                    checked={listaCapacidades.includes(cap.id)}
                                    onChange={() => handleCheckboxChange(cap.id)}
                                    className={styles.checkbox}
                                />
                                <label htmlFor={`cap-${cap.id}`} className={styles.labelCheckbox}>
                                    {cap.nombre}
                                </label>
                            </div>
                        ))}
                    </div>
                </div> */}

                <div className={styles.filaBotones}>
                    <Boton type="submit" variant="guardar">
                        {editando ? 'Actualizar Cambios' : 'Guardar'}
                    </Boton>
                    <Link to="/insumos">
                        <Boton variant="eliminar">
                            Cancelar
                        </Boton>
                    </Link>
                </div>
            </form>
        </div>
    );
}
