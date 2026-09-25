import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import EmpleadosList from './features/empleados/EmpleadosList';
import EmpleadoForm from './features/empleados/EmpleadoForm';
import EmpleadoDetail from './features/empleados/EmpleadoDetail';
import EmpleadoDelete from './features/empleados/EmpleadoDelete';

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

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <nav className="nav">
        <Link to="/" className="navLink">Inicio</Link>
        
        <div className="dropdown">
          <span className="navLink">Recursos Humanos ▾</span>
          <div className="dropdownContent">
            <Link to="/empleados">Directorio de Empleados</Link>
            <Link to="/capacidades">Gestión de Capacidades</Link>
            <Link to="/sectores">Gestión de Sectores</Link>
          </div>
        </div>

        <div className="dropdown">
          <span className="navLink">Gestión de Insumos ▾</span>
          <div className="dropdownContent">
            <Link to="/insumos">Inventario de Insumos</Link>
            <Link to="/unidadesMedida">Unidades de Medida</Link>
          </div>
        </div>

        <div className="dropdown">
          <span className="navLink">Equipamiento ▾</span>
          <div className="dropdownContent">
            <Link to="/equipos">Inventario de Equipos</Link>
          </div>
        </div>
      </nav>

      <div>
        <Routes>
          {/* Vista o ruta raíz */}
          <Route path="/" element={<h1>SAIA - Grupo 2</h1>} />
          
          {/* Rutas principales */}
          <Route path="/empleados" element={<EmpleadosList />} />
          <Route path="/empleados/nuevo" element={<EmpleadoForm />} />
          <Route path="/empleados/editar/:id" element={<EmpleadoForm />} />
          <Route path="/empleados/eliminar/:id" element={<EmpleadoDelete />} />
          <Route path="/empleados/:id" element={<EmpleadoDetail />} />
          
          <Route path="/capacidades" element={<CapacidadesList />} />
          <Route path="/capacidades/nuevo" element={<CapacidadForm />} />
          
          <Route path="/insumos" element={<InsumosList />} />
          <Route path="/insumos/nuevo" element={<InsumoForm />} />
          <Route path="/insumos/editar/:id" element={<InsumoForm />} />
          <Route path="/insumos/eliminar/:id" element={<InsumoDelete />} />
          <Route path="/insumos/:id" element={<InsumoDetail />} />

          <Route path="/unidadesMedida" element={<UnidadesMedidaList />} />

          <Route path="/equipos" element={<EquiposList />} />
          <Route path="/equipos/nuevo" element={<EquipoForm />} />
          <Route path="/equipos/:id" element={<EquipoDetail />} />
          <Route path="/equipos/editar/:id" element={<EquipoForm />} />
          <Route path="/equipos/eliminar/:id" element={<EquipoDelete />} />

          {/* Rutas de Sectores */}
          <Route path="/sectores" element={<SectoresList />} />
          <Route path="/sectores/nuevo" element={<SectorForm />} />
          <Route path="/sectores/editar/:id" element={<SectorForm />} />
          <Route path="/sectores/:id" element={<SectorDetail />} /> 
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;