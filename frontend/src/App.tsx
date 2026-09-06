import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import EmpleadosList from './pages/EmpleadosList';
import EmpleadoForm from './pages/EmpleadoForm';
import EmpleadoDetail from './pages/EmpleadoDetail';
import EmpleadoDelete from './pages/EmpleadoDelete';

import './App.css';
function App() {
  return (
    <BrowserRouter>
      <nav className="nav">
        <Link to="/">Inicio</Link>
        <Link to="/empleados">Empleados</Link>
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
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;