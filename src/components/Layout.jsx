import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Gauge, TrendingUp, TrendingDown, Menu, Plus } from 'lucide-react';
import Formulario from './Formulario.jsx';

const link = (to, rotulo, Icone) => (
  <NavLink key={to} to={to} end><Icone size={22} aria-hidden="true" /><span>{rotulo}</span></NavLink>
);

export default function Layout({ children }) {
  const [aberto, setAberto] = useState(null); // null | 'escolha' | 'ganho' | 'despesa'
  return (
    <div className="app">
      <nav aria-label="Principal">
        {link('/', 'Início', Gauge)}
        {link('/ganhos', 'Ganhos', TrendingUp)}
        <button className="novo" aria-label="Novo lançamento" onClick={() => setAberto('escolha')}>
          <Plus size={26} aria-hidden="true" /><span className="novo-t">Novo lançamento</span>
        </button>
        {link('/despesas', 'Despesas', TrendingDown)}
        {link('/mais', 'Mais', Menu)}
      </nav>
      <main>{children}</main>
      {aberto === 'escolha' && (
        <div className="folha" onClick={(e) => e.target === e.currentTarget && setAberto(null)}>
          <div className="escolha">
            <h1>Novo lançamento</h1>
            <button onClick={() => setAberto('ganho')}>Registrar ganho</button>
            <button className="sec" onClick={() => setAberto('despesa')}>Registrar despesa</button>
          </div>
        </div>
      )}
      {(aberto === 'ganho' || aberto === 'despesa') && <Formulario tipo={aberto} aoFechar={() => setAberto(null)} />}
    </div>
  );
}
