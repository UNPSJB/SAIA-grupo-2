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



import ProductosLimpiezaList from './features/productosLimpieza/ProductosLimpiezaList';
import ProductoLimpiezaForm from './features/productosLimpieza/ProductoLimpiezaForm';
import ProductoLimpiezaDelete from './features/productosLimpieza/ProductoLimpiezaDelete';
import ProductoLimpiezaDetail from './features/productosLimpieza/ProductoLimpiezaDetail';

import EquiposList from './features/equipos/EquiposList';
import EquipoForm from './features/equipos/EquipoForm';
import EquipoDetail from './features/equipos/EquipoDetail';
import EquipoDelete from './features/equipos/EquipoDelete';


import ConsumoForm from './features/consumos/ConsumoForm';
import ConsumoReporte from './features/consumos/ConsumoReporte';
import ElementosLimpiezaList from './features/elementosLimpieza/ElementosLimpiezaList';
import ElementoLimpiezaForm from './features/elementosLimpieza/ElementoLimpiezaForm';
import ElementoLimpiezaDetail from './features/elementosLimpieza/ElementoLimpiezaDetail';
import ElementoLimpiezaDelete from './features/elementosLimpieza/ElementoLimpiezaDelete';

import AlertasRecambio from './features/elementosLimpieza/AlertasRecambio';

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

      <div className="dropdown">
        <span className="navLink">Limpieza ▾</span>
        <div className="dropdownContent">
          <Link to="/elementosLimpieza">Elementos de Limpieza</Link>
          <Link to="/productosLimpieza">Productos de Limpieza</Link>
          <Link to="/consumos/nuevo">Registrar Consumo Limpieza</Link>
          <Link to="/consumos/reporte">Reporte de Consumos</Link>
        </div>
      </div>

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
        
          <Route path="/consumos/nuevo" element={<ConsumoForm />} />
          <Route path="/consumos/reporte" element={<ConsumoReporte />} />

          <Route path="/elementosLimpieza" element={<ElementosLimpiezaList />} />
          <Route path="/elementosLimpieza/nuevo" element={<ElementoLimpiezaForm />} />
          <Route path="/elementosLimpieza/editar/:id" element={<ElementoLimpiezaForm />} />
          <Route path="/elementosLimpieza/eliminar/:id" element={<ElementoLimpiezaDelete />} />
          <Route path="/elementosLimpieza/:id" element={<ElementoLimpiezaDetail />} />

          <Route path="/productosLimpieza" element={<ProductosLimpiezaList />} />
          <Route path="/productosLimpieza/nuevo" element={<ProductoLimpiezaForm />} />
          <Route path="/productosLimpieza/editar/:id" element={<ProductoLimpiezaForm />} />
          <Route path="/productosLimpieza/eliminar/:id" element={<ProductoLimpiezaDelete />} />
          <Route path="/productosLimpieza/:id" element={<ProductoLimpiezaDetail />} />

          <Route path="/elementosLimpieza/alertas" element={<AlertasRecambio />} />

        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;