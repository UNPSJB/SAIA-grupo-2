import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import EmpleadosList from './features/empleados/EmpleadosList';
import EmpleadoForm from './features/empleados/EmpleadoForm';
import EmpleadoDetail from './features/empleados/EmpleadoDetail';
import EmpleadoDelete from './features/empleados/EmpleadoDelete';
import CapacidadesList from './features/capacidades/CapacidadesList';
import CapacidadForm from './features/capacidades/CapacidadForm';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <nav className="nav">
        <Link to="/">Inicio</Link>
        <Link to="/empleados">Empleados</Link>
        <Link to="/capacidades">Capacidades</Link>
      </nav>

      <div>
        <Routes>
          {/* Vista o ruta raíz */}
          <Route path="/" element={<h2>Prueba de Empleado</h2>} />
          
          {/* Rutas principales */}
          <Route path="/empleados" element={<EmpleadosList />} />
          <Route path="/empleados/nuevo" element={<EmpleadoForm />} />
          <Route path="/empleados/:id" element={<EmpleadoDetail />} />
          <Route path="/empleados/editar/:id" element={<EmpleadoForm />} />
          <Route path="/empleados/eliminar/:id" element={<EmpleadoDelete />} />
          <Route path="/capacidades" element={<CapacidadesList />} />
          <Route path="/capacidades/nuevo" element={<CapacidadForm />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;