import { useEffect, useState } from "react";
import {
    getConfiguracionProduccion,
    getListaIngredientesRotulo,
    guardarOrdenManualIngredientes,
    restablecerOrdenAutomaticoIngredientes,
    updateConfiguracionProduccion,
} from '../../services/recetasServices';
import type { FormatoDeclaracionAditivos, ListaIngredientesRotulo } from "../../types/receta";
import { useAuth } from "../../context/AuthContext";
import Boton from "../../components/Boton";
import styles from '../../styles/shared.module.css';

interface Props {
    recetaId: number;
    version: number;
    esVigente: boolean;
}

export default function ListaIngredientesRotuloTab({ recetaId, version, esVigente }: Props) {
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === 'admin';
    const puedeEditar = esAdmin && esVigente;

    const [datos, setDatos] = useState<ListaIngredientesRotulo | null>(null);
    const [formatoAditivos, setFormatoAditivos] = useState<FormatoDeclaracionAditivos>('funcion_ambos');
    const [cargando ,setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cargar = async () => {
        try {
            setCargando(true);
            setError(null);
            const [listaRes, configRes] = await Promise.all([
                getListaIngredientesRotulo(recetaId, version),
                getConfiguracionProduccion(),
            ]);
            setDatos(listaRes);
            setFormatoAditivos(configRes.formato_declaracion_aditivos);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar lista de ingredientes.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        void cargar();
    }, [recetaId, version]);

    const handleCambiarFormato = async (nuevoFormato: FormatoDeclaracionAditivos) => {
        if (!usuario || !esAdmin) return;
        try {
            setGuardando(true);
            setError(null);
            await updateConfiguracionProduccion(nuevoFormato, usuario.rol);
            setFormatoAditivos(nuevoFormato);
            const actualizado = await getListaIngredientesRotulo(recetaId, version);
            setDatos(actualizado);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo actualizar el formato.');
        } finally {
            setGuardando(false);
        }
    };

    const moverIngrediente = async (indice: number, direccion: -1 | 1) => {
        if (!datos || !usuario) return;
        const destino = indice + direccion;
        if (destino < 0 || destino >= datos.ingredientes.length) return;

        const nuevaLista = [...datos.ingredientes];
        const [movido] = nuevaLista.splice(indice, 1);
        nuevaLista.splice(destino, 0, movido);

        try {
            setGuardando(true);
            setError(null);
            const actualizado = await guardarOrdenManualIngredientes(
                recetaId,
                version,
                nuevaLista.map((i) => i.insumo_id),
                usuario.id ?? null,
                usuario.rol,
            );
            setDatos(actualizado);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo actualizar el orden.');
        } finally {
            setGuardando(false);
        }
    };

    const handleVolverAutomatico = async () => {
        if (!usuario) return;
        try {
            setGuardando(true);
            setError(null);
            const actualizado = await restablecerOrdenAutomaticoIngredientes(
                recetaId,
                version,
                usuario.rol,
            );
            setDatos(actualizado);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo restablecer el orden automático.');
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) return <p className={styles.textMuted}>Calculando lista de ingredientes para rótulo...</p>;
    if (error) return <p className={styles.textDanger} role="alert">{error}</p>;
    if (!datos) return null;

    return (
        <div className={styles.bloqueDetalle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ margin: 0 }}>Lista de ingredientes para rótulo</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {datos.es_orden_manual ? (
                        <span
                            style={{
                                background: 'rgba(234, 179, 8, 0.15)',
                                color: '#eab308',
                                border: '1px solid rgba(234, 179, 8, 0.4)',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                            }}
                        >
                            Orden ajustado manualmente
                            {datos.orden_manual_por
                                ? ` · ${datos.orden_manual_por.nombre} ${datos.orden_manual_por.apellido}`
                                : ''}
                        </span>
                    ) : (
                        <span className={styles.textMuted} style={{ fontSize: '0.85rem' }}>
                            Orden automático (decreciente por proporción)
                        </span>
                    )}

                    {puedeEditar && datos.es_orden_manual && (
                        <Boton
                            type="button"
                            variant="volver"
                            onClick={handleVolverAutomatico}
                            disabled={guardando}
                        >
                            Volver al orden automático
                        </Boton>
                    )}
                </div>
            </div>

            {datos.aviso_orden_anterior && (
                <div
                    role="status"
                    style={{
                        marginTop: '12px',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        background: 'rgba(59, 130, 246, 0.12',
                        border: '1px solid rgba(59, 130, 246, 0.35)',
                        color: '#93c5fd',
                        fontSize: '0.88rem',
                    }}
                >
                   ℹ {datos.aviso_orden_anterior} 
                </div>
            )}

            {esAdmin && (
                <div
                    style={{
                        marginTop: '14px',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color, #334155)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px,'
                    }}
                >
                    <label htmlFor="selector-formato-aditivos" style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-h)' }}>
                        Configuración de producción · Formato de declaración de aditivos:
                    </label>
                    <select
                        id="selector-formato-aditivos"
                        value={formatoAditivos}
                        disabled={guardando}
                        onChange={(e) => handleCambiarFormato(e.target.value as FormatoDeclaracionAditivos)}
                        className={styles.input}
                        style={{ width: 'auto', padding: '6px 10px', fontSize: '0.85rem' }}
                    >
                        <option value="funcion_ambos">Funcion + Nombre completo + Número INS</option>
                        <option value="funcion_nombre">Funcion + Nombre completo</option>
                        <option value="funcion_ins">Funcion + Número INS</option>
                    </select>
                </div>
            )}

            <div
                style={{
                    marginTop: '16px',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary, rgba(15, 23, 42, 0.5))',
                    border: '1px solid var(--border-color, #334155)',
                }}
            >
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    TEXTO FINAL PARA RÓTULO:
                </span>
                <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.5, color: 'var(--text-h)' }}>
                    {datos.texto_rotulo || 'Sin ingredientes registrados.'}
                </p>
            </div>
            <h4 style={{ marginTop: '20px', marginBottom: '8px' }}>1. Ingredientes</h4>
            <table 
                className={styles.tabla}
                style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginTop: '8px',
                }}
            >
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color, #334155', textAlign: 'left'}}>
                        <th style={{ padding: '10px 12px', width: '60px' }}>Pos.</th>
                        <th style={{ padding: '10px 12px', width: '32%' }}>Denominación para rótulo</th>
                        <th style={{ padding: '10px 12px', width: '28%' }}>Insumo</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', width: '110px' }}>Proporción</th>
                        {puedeEditar && (
                            <th style={{ padding: '10px 12px', textAlign: 'center', width: '170px' }}>
                                Ajuste manual</th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {datos.ingredientes.map((ing, idx) => (
                        <tr
                            key={ing.insumo_id}
                            style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}    
                        >
                            <td style={{ padding: '10px 12px' }}>{idx + 1}°</td>
                            <td style={{ padding: '10px 12px' }}>
                                <strong>{ing.denominacion_rotulo}</strong>
                            </td>
                            <td style={{ padding: '10px 12px' }}>{ing.nombre_insumo}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                {ing.porcentaje.toFixed(2)} %
                            </td>
                            {puedeEditar && (
                                <td style={{ padding: '10px 12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}></div>
                                    <button
                                        type="button"
                                        className={styles.botonFiltro}
                                        disabled={guardando || idx === 0}
                                        onClick={() => moverIngrediente(idx, -1)}
                                        aria-label={`Subir ${ing.denominacion_rotulo}`}
                                    >
                                        ↑ Subir
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.botonFiltro}
                                        disabled={guardando || idx === datos.ingredientes.length -1}
                                        onClick={() => moverIngrediente(idx, 1)}
                                        aria-label={`Bajar ${ing.denominacion_rotulo}`}
                                    >
                                        ↓ Bajar
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>

            {datos.grupos_aditivos.length > 0 && (
                <>
                    <h4 style={{ marginTop: '20px', marginBottom: '8px' }}>
                        2. Aditivos (agrupados por función)
                    </h4>
                    <ul>
                        {datos.grupos_aditivos.map((grupo) => (
                            <li key={grupo.clase_funcional_id} style={{ marginBottom: '6px' }}>
                                {grupo.texto_grupo}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
