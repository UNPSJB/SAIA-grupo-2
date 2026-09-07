import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createCapacidad } from '../../services/capacidadesServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function CapacidadForm() {
    const [nombre, setNombre] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            const exito = await createCapacidad(nombre);
            if (exito) {
                navigate('/capacidades');
            } else {
                alert('Hubo un error al crear el registro.');
            }
        } catch (error) {
            console.error('Error de red:', error);
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Crear Nueva Capacidad</h2>
            
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Nombre de la Capacidad:</label>
                    <input 
                        type="text" 
                        value={nombre} 
                        onChange={(e) => setNombre(e.target.value)} 
                        required 
                    />
                </div>

                <div className={styles.filaBotones}>
                    <Boton type="submit" variant="guardar">
                        Guardar
                    </Boton>
                    <Link to="/capacidades">
                        <Boton variant="eliminar">
                            Cancelar
                        </Boton>
                    </Link>
                </div>
            </form>
        </div>
    );
}
