import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/shared.module.css';

interface LoginFormValues {
    legajo: string;
    dni: string;
}

export default function Login() {
    const [errorBackend, setErrorBackend] = useState('');
    const { login } = useAuth();

    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
        defaultValues: { legajo: '', dni: '' }
    });

    const onSubmit = async (data: LoginFormValues) => {
        setErrorBackend('');

        try {
            const respuesta = await fetch('http://127.0.0.1:8000/empleados/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!respuesta.ok) {
                throw new Error('Credenciales inválidas');
            }

            const result = await respuesta.json();
            login(result.empleado);
        } catch (err) {
            setErrorBackend('Legajo o DNI incorrectos. Por favor, intente nuevamente.');
        }
    };

    return (
        <div className={styles.contenedorPrincipal} style={{ justifyContent: 'center', paddingTop: 0 }}>
            <div className={styles.tarjetaEstatica} style={{ maxWidth: '420px', width: '100%', alignItems: 'center' }}>
                <h1 style={{ margin: '0 0 5px 0', fontSize: '2.2rem' }}>SAIA 2</h1>
                <p className={styles.textMuted} style={{ margin: '0 0 25px 0' }}>Sistema de Apoyo a la Inocuidad</p>

                {errorBackend && (
                    <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '20px', width: '100%', textAlign: 'center', fontSize: '0.95rem', border: '1px solid #f87171', boxSizing: 'border-box' }}>
                        {errorBackend}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className={styles.formularioTarjeta} style={{ padding: 0, boxShadow: 'none', border: 'none' }}>
                    <div className={styles.formGroup} style={{ marginBottom: '20px' }}>
                        <label>Legajo</label>
                        <input 
                            type="text" 
                            placeholder="Ej: EMP-1000"
                            {...register('legajo', { required: 'El legajo es obligatorio' })}
                            style={errors.legajo ? { borderColor: '#ef4444' } : {}}
                        />
                        {errors.legajo && (
                            <span className={styles.textDanger}>
                                {errors.legajo.message}
                            </span>
                        )}
                    </div>

                    <div className={styles.formGroup} style={{ marginBottom: '25px' }}>
                        <label>Contraseña (DNI)</label>
                        <input 
                            type="password" 
                            placeholder="Ingrese su DNI sin puntos"
                            {...register('dni', { required: 'La contraseña es obligatoria' })}
                            style={errors.dni ? { borderColor: '#ef4444' } : {}}
                        />
                        {errors.dni && (
                            <span className={styles.textDanger}>
                                {errors.dni.message}
                            </span>
                        )}
                    </div>

                    <button 
                        type="submit" 
                        style={{ 
                            width: '100%', 
                            padding: '14px', 
                            backgroundColor: '#16a34a', 
                            color: '#ffffff', 
                            border: 'none', 
                            borderRadius: '8px', 
                            fontSize: '1.1rem', 
                            fontWeight: 'bold', 
                            cursor: 'pointer',
                            boxSizing: 'border-box'
                        }}
                    >
                        Ingresar
                    </button>
                </form>
                <p style={{ color: '#16a34a', margin: '20px 0 5px 0', fontSize: '0.9rem' }}>admin: EMP-1001 / 22222222</p>
                <p style={{ color: '#16a34a', margin: '0', fontSize: '0.9rem' }}>operario: EMP-1002 / 33333333</p>
            </div>
        </div>
    );
}
