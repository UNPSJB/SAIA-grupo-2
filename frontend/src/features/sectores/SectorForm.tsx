import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Empleado } from '../../types/empleados';
import { getEmpleados } from '../../services/empleadosServices';
import { getSectores, saveSector } from '../../services/sectoresServices';
import Boton from '../../components/Boton';
import ModalAlerta from '../../components/alerta';
import styles from '../../styles/shared.module.css';

export default function SectorForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const esEdicion = Boolean(id);

    const [nombre, setNombre] = useState('');
    const [responsableId, setResponsableId] = useState<number | null>(null);
    const [empleadosDisponibles, setEmpleadosDisponibles] = useState<Empleado[]>([]);
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '', exito: false });

    useEffect(() => {
        getEmpleados()
            .then(data => setEmpleadosDisponibles(data))
            .catch(err => console.error("Error al cargar empleados:", err));

        if (esEdicion && id) {
            getSectores()
                .then(sectores => {
                    const sectorActual = sectores.find(s => s.id === Number(id));
                    if (sectorActual) {
                        setNombre(sectorActual.nombre);
                        setResponsableId(sectorActual.responsable_id);
                    }
                })
                .catch(err => console.error("Error al cargar sector:", err));
        }
    }, [id, esEdicion]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre.trim()) {
            setModalAlerta({ isOpen: true, titulo: "Campo Requerido", mensaje: "El nombre del sector no puede estar vacío.", exito: false });
            return;
        }

        const payload = {
            nombre,
            responsable_id: responsableId ? Number(responsableId) : null,
            listaEmpleados: null 
        };

        const exito = await saveSector(payload, esEdicion ? Number(id) : undefined);

        if (exito) {
            setModalAlerta({
                isOpen: true,
                titulo: "Operación Exitosa",
                mensaje: esEdicion ? "El sector ha sido actualizado correctamente." : "El sector ha sido registrado correctamente.",
                exito: true
            });
        } else {
            setModalAlerta({ isOpen: true, titulo: "Error", mensaje: "Hubo un error al guardar el sector. Verifique los datos.", exito: false });
        }
    };

    const posiblesResponsables = empleadosDisponibles.filter(emp => 
        emp.capacidades && emp.capacidades.some(cap => cap.nombre.toLowerCase().includes('administrador'))
    );

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>{esEdicion ? 'Editar Sector' : 'Registrar Nuevo Sector'}</h2>

            <form onSubmit={handleSubmit} className={styles.formularioContainer} style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'left' }}>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-h)', fontWeight: '500' }}>
                        Nombre del Sector:
                    </label>
                    <input 
                        type="text" 
                        value={nombre} 
                        onChange={(e) => setNombre(e.target.value)} 
                        required 
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card-bg)', color: 'var(--text-h)' }}
                        placeholder="Ej. Producción, Logística..."
                    />
                </div>

                <div style={{ marginBottom: '30px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-h)', fontWeight: '500' }}>
                        Responsable / Administrativo a Cargo:
                    </label>
                    <select 
                        value={responsableId ?? ''} 
                        onChange={(e) => setResponsableId(e.target.value ? Number(e.target.value) : null)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card-bg)', color: 'var(--text-h)' }}
                    >
                        <option value="">-- Sin responsable asignado --</option>
                        {posiblesResponsables.map(emp => (
                            <option key={emp.id} value={emp.id}>
                                {emp.nombre} {emp.apellido} ({emp.legajo})
                            </option>
                        ))}
                    </select>
                    {posiblesResponsables.length === 0 && (
                        <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                            * No hay empleados con capacidad de "Administrar" registrados.
                        </small>
                    )}
                </div>

                <div className={styles.filaBotones} style={{ justifyContent: 'space-between' }}>
                    <Boton variant="volver" type="button" onClick={() => navigate('/sectores')}>
                        Cancelar
                    </Boton>
                    <Boton variant="guardar" type="submit">
                        {esEdicion ? 'Actualizar Sector' : 'Guardar Sector'}
                    </Boton>
                </div>
            </form>

            <ModalAlerta isOpen={modalAlerta.isOpen} titulo={modalAlerta.titulo} mensaje={modalAlerta.mensaje} onClose={() => { setModalAlerta({ ...modalAlerta, isOpen: false }); if (modalAlerta.exito) navigate('/sectores'); }} />
        </div>
    );
}