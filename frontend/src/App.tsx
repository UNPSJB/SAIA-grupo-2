import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MenuLateral from './components/MenuLateral';
import Inicio from './features/inicio/Inicio';
import Login from './features/auth/Login';

import EmpleadosList from './features/empleados/EmpleadosList';
import EmpleadoForm from './features/empleados/EmpleadoForm';
import EmpleadoDetail from './features/empleados/EmpleadoDetail';
import EmpleadoDelete from './features/empleados/EmpleadoDelete';
import DocumentacionEmpleado from './features/documentacion/DocumentacionEmpleado';
import DocumentacionForm from './features/documentacion/DocumentacionForm';

import CapacidadesList from './features/capacidades/CapacidadesList';
import CapacidadForm from './features/capacidades/CapacidadForm';

import InsumosList from './features/insumos/InsumosList';
import InsumoForm from './features/insumos/InsumoForm';
import InsumoDelete from './features/insumos/InsumoDelete';
import InsumoDetail from './features/insumos/InsumoDetail';

import UnidadesMedidaList from './features/unidadesMedida/UnidadesMedidaList';

import EquiposList from './features/equipos/EquiposList';
import EquipoForm from './features/equipos/EquipoForm';
import EquipoDetail from './features/equipos/EquipoDetail';
import EquipoDelete from './features/equipos/EquipoDelete';

import SectoresList from './features/sectores/SectoresList';
import SectorForm from './features/sectores/SectorForm';
import SectorDetail from './features/sectores/SectorDetail';

import ProductosList from './features/productosLimpieza/ProductosList';
import ProductoForm from './features/productosLimpieza/ProductoForm';
import ProductoDelete from './features/productosLimpieza/ProductoDelete';

import TareasList from './features/tareas/TareasList';
import TareaForm from './features/tareas/TareaForm';
import TareaDelete from './features/tareas/TareaDelete'; 

import PlanesList from './features/planes/PlanesList';
import PlanForm from './features/planes/PlanForm';
import PlanDelete from './features/planes/PlanDelete';
import PlanDetail from './features/planes/PlanDetail';

import ChecklistList from './features/checklists/ChecklistList';
import HistorialChecklistList from './features/checklists/HistorialChecklistList';
import GraficoCumplimiento from './features/tablero/GraficoCumplimiento';

import ElementosLimpiezaList from './features/elementosLimpieza/ElementosLimpiezaList';
import ElementoLimpiezaForm from './features/elementosLimpieza/ElementoLimpiezaForm';
import ElementoLimpiezaDetail from './features/elementosLimpieza/ElementoLimpiezaDetail';
import ElementoLimpiezaDelete from './features/elementosLimpieza/ElementoLimpiezaDelete';
import AlertasRecambio from './features/elementosLimpieza/AlertasRecambio';
import VencimientosList from './features/vencimientos/VencimientosList'; 
import VencimientosDocumentacionList from './features/vencimientosDocumentacion/VencimientosDocumentacionList';
import AlertasDocumentacion from './features/documentacion/AlertaVencimiento';
import ProductosElaboradosList from './features/productos/ProductosList';
import ProductoElaboradoForm from './features/productos/ProductoForm';
import ProductoElaboradoDetail from './features/productos/ProductoDetail';
import LotesList from './features/lotesProduccion/LotesList';
import LoteForm from './features/lotesProduccion/LoteForm';

import IncidentesList from './features/incidentes/IncidentesList';
import IncidenteForm from './features/incidentes/IncidenteForm';
import IncidenteDetail from './features/incidentes/IncidenteDetail';
import EstadisticaIncidentes from './features/incidentes/EstadisticaIncidentes';

import DocumentosVersionadosList from './features/documentosVersionados/DocumentosVersionadosList';
import DocumentoVersionadoForm from './features/documentosVersionados/DocumentoVersionadoForm';

import DocumentosVigentesList from './features/documentosVersionados/DocumentosVigentesList';


import './App.css';

function RutaAdmin({ children }: { children: React.ReactElement }) {
  const { usuario } = useAuth();
  if (usuario?.rol !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
}

const ETIQUETA_ROL: Record<'admin' | 'operario', string> = {
  admin: 'Administrador',
  operario: 'Operario',
};

function RutasProtegidas() {
  const { isAuthenticated, logout, usuario } = useAuth();
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  const toggleSidebar = () => setSidebarAbierto(!sidebarAbierto);
  const cerrarSidebar = () => setSidebarAbierto(false);

  const isAdmin = usuario?.rol === 'admin';

  const iniciales = `${usuario?.nombre?.charAt(0) ?? ''}${usuario?.apellido?.charAt(0) ?? ''}`.toUpperCase();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <>
      <div className="appLayout">
        <header className="mobileHeader">
          <NavLink to="/" className="mobileBrand" onClick={cerrarSidebar}>
            <i className="bi bi-house-door-fill"></i>
            <span>SAIA</span>
          </NavLink>
          <button className="mobileMenuBtn" onClick={toggleSidebar} aria-label="Abrir menú">
            <i className={`bi ${sidebarAbierto ? 'bi-x-lg' : 'bi-list'}`}></i>
          </button>
        </header>

        <div
          className={`sidebarOverlay ${sidebarAbierto ? 'sidebarOverlayVisible' : ''}`}
          onClick={cerrarSidebar}
        />

        <aside className={`sidebar ${sidebarAbierto ? 'sidebarOpen' : ''}`}>
          <NavLink to="/" className="marca" onClick={cerrarSidebar}>
            <i className="bi bi-house-door-fill"></i>
            <span>SAIA</span>
          </NavLink>

          <nav className="navegacion" aria-label="Menú principal">
            <MenuLateral esAdmin={isAdmin} onNavegar={cerrarSidebar} />
          </nav>

          <div className="userSection">
            <div className="avatar">{iniciales}</div>
            <div className="userInfo">
              <span className="userNombre">{usuario?.nombre} {usuario?.apellido}</span>
              <span className="userRol">{usuario ? ETIQUETA_ROL[usuario.rol] : ''}</span>
            </div>
            <button onClick={() => { cerrarSidebar(); logout(); }} className="logoutBtn" title="Cerrar sesión" aria-label="Cerrar sesión">
              <i className="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </aside>

        <main className="mainContent">
          <Routes>
            <Route path="/" element={<Inicio />} />
            
            <Route path="/empleados" element={<RutaAdmin><EmpleadosList /></RutaAdmin>} />
            <Route path="/empleados/nuevo" element={<RutaAdmin><EmpleadoForm /></RutaAdmin>} />
            <Route path="/empleados/editar/:id" element={<RutaAdmin><EmpleadoForm /></RutaAdmin>} />
            <Route path="/empleados/eliminar/:id" element={<RutaAdmin><EmpleadoDelete /></RutaAdmin>} />
            <Route path="/empleados/:id" element={<EmpleadoDetail />} />
            <Route path="/empleados/:empleadoId/documentacion" element={<RutaAdmin><DocumentacionEmpleado /></RutaAdmin>} />
            <Route path="/empleados/:empleadoId/documentacion/nuevo" element={<RutaAdmin><DocumentacionForm /></RutaAdmin>} />
            <Route path="/empleados/:empleadoId/documentacion/editar/:id" element={<RutaAdmin><DocumentacionForm /></RutaAdmin>} />
            
            <Route path="/capacidades" element={<RutaAdmin><CapacidadesList /></RutaAdmin>} />
            <Route path="/capacidades/nuevo" element={<RutaAdmin><CapacidadForm /></RutaAdmin>} />
            
            <Route path="/insumos" element={<RutaAdmin><InsumosList /></RutaAdmin>} />
            <Route path="/insumos/nuevo" element={<RutaAdmin><InsumoForm /></RutaAdmin>} />
            <Route path="/insumos/editar/:id" element={<RutaAdmin><InsumoForm /></RutaAdmin>} />
            <Route path="/insumos/eliminar/:id" element={<RutaAdmin><InsumoDelete /></RutaAdmin>} />
            <Route path="/insumos/:id" element={<InsumoDetail />} />

            <Route path="/unidadesMedida" element={<RutaAdmin><UnidadesMedidaList /></RutaAdmin>} />

            <Route path="/equipos" element={<RutaAdmin><EquiposList /></RutaAdmin>} />
            <Route path="/equipos/nuevo" element={<RutaAdmin><EquipoForm /></RutaAdmin>} />
            <Route path="/equipos/:id" element={<EquipoDetail />} />
            <Route path="/equipos/editar/:id" element={<RutaAdmin><EquipoForm /></RutaAdmin>} />
            <Route path="/equipos/eliminar/:id" element={<RutaAdmin><EquipoDelete /></RutaAdmin>} />
            <Route path="/vencimientos" element={<RutaAdmin><VencimientosList /></RutaAdmin>} />

            <Route path="/sectores" element={<RutaAdmin><SectoresList /></RutaAdmin>} />
            <Route path="/sectores/nuevo" element={<RutaAdmin><SectorForm /></RutaAdmin>} />
            <Route path="/sectores/editar/:id" element={<RutaAdmin><SectorForm /></RutaAdmin>} />
            <Route path="/sectores/:id" element={<SectorDetail />} /> 

            <Route path="/productos_limpieza" element={<RutaAdmin><ProductosList /></RutaAdmin>} />
            <Route path="/productos_limpieza/nuevo" element={<RutaAdmin><ProductoForm /></RutaAdmin>} />
            <Route path="/productos_limpieza/editar/:id" element={<RutaAdmin><ProductoForm /></RutaAdmin>} />
            <Route path="/productos_limpieza/eliminar/:id" element={<RutaAdmin><ProductoDelete /></RutaAdmin>} />

            <Route path="/elementosLimpieza" element={<RutaAdmin><ElementosLimpiezaList /></RutaAdmin>} />
            <Route path="/elementosLimpieza/nuevo" element={<RutaAdmin><ElementoLimpiezaForm /></RutaAdmin>} />
            <Route path="/elementosLimpieza/alertas" element={<AlertasRecambio />} />
            <Route path="/elementosLimpieza/editar/:id" element={<RutaAdmin><ElementoLimpiezaForm /></RutaAdmin>} />
            <Route path="/elementosLimpieza/eliminar/:id" element={<RutaAdmin><ElementoLimpiezaDelete /></RutaAdmin>} />
            <Route path="/elementosLimpieza/:id" element={<ElementoLimpiezaDetail />} />

            <Route path="/tareas" element={<TareasList />} />
            <Route path="/tareas/nueva" element={<RutaAdmin><TareaForm /></RutaAdmin>} />
            <Route path="/tareas/editar/:id" element={<RutaAdmin><TareaForm /></RutaAdmin>} />
            <Route path="/tareas/eliminar/:id" element={<RutaAdmin><TareaDelete /></RutaAdmin>} />

            <Route path="/planes" element={<RutaAdmin><PlanesList /></RutaAdmin>} />
            <Route path="/planes/nuevo" element={<RutaAdmin><PlanForm /></RutaAdmin>} />
            <Route path="/planes/editar/:id" element={<RutaAdmin><PlanForm /></RutaAdmin>} />
            <Route path="/planes/eliminar/:id" element={<RutaAdmin><PlanDelete /></RutaAdmin>} />
            <Route path="/planes/:id" element={<PlanDetail />} />

            <Route path="/checklists/hoy" element={<ChecklistList />} />
            <Route path="/checklists/historial" element={<RutaAdmin><HistorialChecklistList /></RutaAdmin>} />
            <Route path="/checklists/cumplimiento" element={<RutaAdmin><GraficoCumplimiento /></RutaAdmin>} />

            <Route path="/vencimientos-documentacion" element={<RutaAdmin><VencimientosDocumentacionList /></RutaAdmin>}/>
            <Route path="/alertas-documentacion" element={<RutaAdmin><AlertasDocumentacion /></RutaAdmin>} />

            <Route path="/productos" element={<RutaAdmin><ProductosElaboradosList /></RutaAdmin>} />
            <Route path="/productos/nuevo" element={<RutaAdmin><ProductoElaboradoForm /></RutaAdmin>} />
            <Route path="/productos/editar/:id" element={<RutaAdmin><ProductoElaboradoForm /></RutaAdmin>} />
            <Route path="/productos/:id" element={<RutaAdmin><ProductoElaboradoDetail /></RutaAdmin>} />
            <Route path="/lotes-produccion" element={<RutaAdmin><LotesList /></RutaAdmin>} />
            <Route path="/lotes-produccion/nuevo" element={<LoteForm />} />

            <Route path="/incidentes/nuevo" element={<IncidenteForm />} />
            <Route path="/incidentes" element={<RutaAdmin><IncidentesList /></RutaAdmin>} />
            <Route path="/incidentes/abiertos" element={<RutaAdmin><IncidentesList soloAbiertos /></RutaAdmin>} />
            <Route path="/incidentes/:id" element={<RutaAdmin><IncidenteDetail /></RutaAdmin>} />
            <Route path="/incidentes/estadisticas" element={<RutaAdmin><EstadisticaIncidentes /></RutaAdmin>} />
            <Route path="/documentos" element={<RutaAdmin><DocumentosVersionadosList /></RutaAdmin>} />
            <Route path="/documentos/nuevo" element={<RutaAdmin><DocumentoVersionadoForm /></RutaAdmin>} />
            <Route path="/documentos/vigentes" element={<DocumentosVigentesList />} />

            
          </Routes>
        </main>
        
      </div>

    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RutasProtegidas />
      </BrowserRouter>
    </AuthProvider>
  );
}
