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

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <nav className="nav">
        <Link to="/">Inicio</Link>
        <Link to="/empleados">Empleados</Link>
        <Link to="/capacidades">Capacidades</Link>
        <Link to="/insumos">Insumos</Link>
        <Link to="/unidadesMedida">Unidades</Link>
        <Link to="/equipos">Equipos</Link>
      </nav>

      <div>
        <Routes>
          {/* Vista o ruta raíz */}
          <Route path="/" element={<h2>Prueba de Empleado</h2>} />
          
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
             
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;