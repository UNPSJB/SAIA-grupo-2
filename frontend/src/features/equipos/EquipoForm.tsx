import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import type { EquipoPayload, TipoEquipo } from '../../types/equipos';
import { getEquipoById, saveEquipo } from '../../services/equiposServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

const OPCIONES_TIPO: TipoEquipo[] = ['heladera', 'horno', 'balanza', 'termometro']

export default function EquipoForm() {
    const [nombre, setNombre] = useState('');
    const [activo, setActivo] = useState(true);
    const [tipo, setTipo] = useState<TipoEquipo | ''>('');
    const [ubicacion, setUbicacion] = useState('');
    
    const navigate = useNavigate();
    const { id } = useParams();
    const editando = Boolean(id);


    useEffect(() => {
        if (editando && id) {
            const cargarEquipo = async () => {
                try {
                    const data = await getEquipoById(id);
                    setNombre(data.nombre);
                    setActivo(data.activo);
                    setTipo(data.tipo);
                    setUbicacion(data.ubicacion);    
                    
                } catch (err) {
                    console.error("Error al cargar equipo:", err);
                }
            };
            cargarEquipo();
        }
    }, [id, editando]);

  

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if(!tipo){
            alert('Selecciones tipo de equipo.');
            return
        }
        
        const datos: EquipoPayload = { 
            nombre, 
            activo, 
            tipo,
            ubicacion 
        };

        try {
            const exito = await saveEquipo(datos, id);
            if (exito) {
                navigate('/equipos');
            } else {
                alert('Hubo un error al guardar el registro.');
            }
        } catch (error) {
            console.error('Error de red:', error);
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>{editando ? 'Editar Equipo' : 'Crear Nuevo Equipo'}</h2>
            
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
                    <label>Tipo de Equipo:</label>
                    <select 
                        value={tipo} 
                        onChange={(e) => setTipo(e.target.value as TipoEquipo)} 
                        required 
                    >
                        <option value="">Seleccione un tipo...</option>
                        {OPCIONES_TIPO.map((opcion) => (
                            <option key={opcion} value={opcion} style={{ textTransform: 'capitalize'}}>
                                {opcion}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>Ubicacion:</label>
                    <input
                        type="text" 
                        value={ubicacion} 
                        onChange={(e) => setUbicacion(e.target.value)} 
                        required 
                    />
                </div>

                <div className={styles.bloqueTipos}>
                    <input 
                        type="checkbox" 
                        id="activo"
                        checked={activo}
                        onChange={(e) => setActivo(e.target.checked)}
                        className={styles.checkbox}
                    />
                    <label htmlFor="activo" className={styles.labelCheckbox}>
                        Equipo Activo
                    </label>
                </div>
                    
                

                <div className={styles.filaBotones}>
                    <Boton type="submit" variant="guardar">
                        {editando ? 'Actualizar Cambios' : 'Guardar'}
                    </Boton>
                    <Link to="/equipos">
                        <Boton variant="volver">
                            Cancelar
                        </Boton>
                    </Link>
                </div>
            </form>
        </div>
    );
}
