import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import styles from './empleados.module.css';

export default function EmpleadoForm() {
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [tipo, setTipo] = useState('operario');
    
    const navigate = useNavigate();
    const { id } = useParams();
    const editando = Boolean(id);

    useEffect(() => {
        if (editando) {
            fetch(`http://127.0.0.1:8000/personas/${id}`)
                .then(res => res.json())
                .then(data => {
                    setNombre(data.nombre);
                    setEmail(data.email);
                    setTipo(data.tipo || 'operario');
                })
                .catch(err => console.error("Error al cargar empleado:", err));
        }
    }, [id, editando]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const datos = { nombre, email, tipo };

        const url = editando 
            ? `http://127.0.0.1:8000/personas/${id}` 
            : 'http://127.0.0.1:8000/personas/';
        const metodo = editando ? 'PUT' : 'POST';

        try {
            const respuesta = await fetch(url, {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos),
            });

            if (respuesta.ok) {
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
                    <label>Email:</label>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                    />
                </div>

                <div>
                    <label>Tipo:</label>
                    <select 
                        value={tipo} 
                        onChange={(e) => setTipo(e.target.value)}
                    >
                        <option value="operario">Operario</option>
                        <option value="administrativo">Administrativo</option>
                        <option value="ambos">Ambos</option>
                    </select>
                </div>

                <button type="submit" className={styles.btnGuardar}>
                    {editando ? 'Actualizar Cambios' : 'Guardar'}
                </button>
                <Link to="/empleados/">
                    <button className={styles.btnCrear}>
                        + Crear Nuevo Empleado
                    </button>
                </Link>
            </form>
        </div>
    );
}