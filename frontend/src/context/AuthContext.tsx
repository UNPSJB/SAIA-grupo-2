import { createContext, useState, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getEmpleadoById } from '../services/empleadosServices';

export interface UsuarioAutenticado {
    id: number;
    legajo: string;
    nombre: string;
    apellido: string;
    rol: 'admin' | 'operario';
    sectores: { id: number; nombre: string }[];
}

interface AuthContextType {
    usuario: UsuarioAutenticado | null;
    login: (datos: UsuarioAutenticado) => void;
    logout: () => void;
    refreshUsuario: () => Promise<void>;
    updateUsuario: (datos: UsuarioAutenticado) => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(() => {
        const guardado = localStorage.getItem('saia_user');
        return guardado ? JSON.parse(guardado) : null;
    });

    const login = (datos: UsuarioAutenticado) => {
        setUsuario(datos);
        localStorage.setItem('saia_user', JSON.stringify(datos));
    };

    const logout = () => {
        setUsuario(null);
        localStorage.removeItem('saia_user');
    };

    const updateUsuario = useCallback((datos: UsuarioAutenticado) => {
        setUsuario(datos);
        localStorage.setItem('saia_user', JSON.stringify(datos));
    }, []);

    const refreshUsuario = useCallback(async () => {
        const guardado = localStorage.getItem('saia_user');
        if (!guardado) return;

        try {
            const actual = JSON.parse(guardado) as UsuarioAutenticado;
            if (actual?.id) {
                const emp = await getEmpleadoById(actual.id.toString());
                if (emp) {
                    const usuarioActualizado: UsuarioAutenticado = {
                        id: emp.id,
                        legajo: emp.legajo,
                        nombre: emp.nombre,
                        apellido: emp.apellido,
                        rol: emp.rol,
                        sectores: emp.sectores || []
                    };
                    setUsuario(usuarioActualizado);
                    localStorage.setItem('saia_user', JSON.stringify(usuarioActualizado));
                }
            }
        } catch (error) {
            console.error("Error al refrescar usuario:", error);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ usuario, login, logout, refreshUsuario, updateUsuario, isAuthenticated: !!usuario }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
}
