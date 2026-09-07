import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import type { Capacidad } from '../../types/capacidades';
import type { EmpleadoPayload } from '../../types/empleados';
import { getCapacidades } from '../../services/capacidadesServices';
import { getEmpleadoById, saveEmpleado } from '../../services/empleadosServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function EmpleadoForm() {
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [capacidadesDisponibles, setCapacidadesDisponibles] = useState<Capacidad[]>([]);
    const [listaCapacidades, setListaCapacidades] = useState<number[]>([]);
    
    const navigate = useNavigate();
    const { id } = useParams();
    const editando = Boolean(id);

    useEffect(() => {
        const cargarCapacidades = async () => {
            try {
                const data = await getCapacidades();
                setCapacidadesDisponibles(data);
            } catch (err) {
                console.error("Error al cargar capacidades:", err);
            }
        };
        cargarCapacidades();
    }, []);

    useEffect(() => {
        if (editando && id) {
            const cargarEmpleado = async () => {
                try {
                    const data = await getEmpleadoById(id);
                    setNombre(data.nombre);
                    setApellido(data.apellido);
                    if (data.capacidades) {
                        setListaCapacidades(data.capacidades.map((c) => c.id));
                    }
                } catch (err) {
                    console.error("Error al cargar empleado:", err);
                }
            };
            cargarEmpleado();
        }
    }, [id, editando]);

    const handleCheckboxChange = (capId: number) => {
        setListaCapacidades(prev => 
            prev.includes(capId) 
                ? prev.filter(capacidadId => capacidadId !== capId)
                : [...prev, capId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const datos: EmpleadoPayload = { 
            nombre, 
            apellido, 
            listaCapacidades: listaCapacidades.length > 0 ? listaCapacidades : null 
        };

        try {
            const exito = await saveEmpleado(datos, id);
            if (exito) {
                navigate('/empleados');
            } else {
                alert('Hubo un error al guardar el registro.');
            }
        } catch (error) {
            console.error('Error de red:', error);
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>{editando ? 'Editar Empleado' : 'Crear Nuevo Registro'}</h2>
            
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
                    <label>Apellido:</label>
                    <input 
                        type="text" 
                        value={apellido} 
                        onChange={(e) => setApellido(e.target.value)} 
                        required 
                    />
                </div>

                <div className={styles.bloqueCapacidades}>
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
                </div>

                <div className={styles.filaBotones}>
                    <Boton type="submit" variant="guardar">
                        {editando ? 'Actualizar Cambios' : 'Guardar'}
                    </Boton>
                    <Link to="/empleados">
                        <Boton variant="eliminar">
                            Cancelar
                        </Boton>
                    </Link>
                </div>
            </form>
        </div>
    );
}
