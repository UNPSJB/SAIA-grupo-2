import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { createCapacidad } from '../../services/capacidadesServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

interface FormValues {
    nombre: string;
}

export default function CapacidadForm() {
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();

    const onSubmit = async (data: FormValues) => {
        try {
            const nombreLimpio = data.nombre.trim();
            if (!nombreLimpio) return;

            const exito = await createCapacidad(nombreLimpio);
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
            <h2>Registrar Nueva Capacidad</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className={styles.formularioTarjeta} style={{ maxWidth: '600px' }}>
                <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr' }}>
                    <div className={styles.formGroup}>
                        <label>Nombre de la Capacidad / Rol:</label>
                        <input 
                            type="text" 
                            {...register('nombre', { 
                                required: "El nombre es obligatorio",
                                validate: (value) => value.trim().length >= 2 || "No puede contener solo espacios o estar vacío",
                                maxLength: { value: 50, message: "No puede superar los 50 caracteres" },
                                pattern: { value: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, message: "Solo se permiten letras y espacios" }
                            })} 
                            style={errors.nombre ? { borderColor: '#ef4444', outline: 'none' } : {}}
                        />
                        {errors.nombre && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{errors.nombre.message}</span>}
                    </div>
                </div>

                <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
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