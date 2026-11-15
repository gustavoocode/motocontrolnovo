import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Inicio from './pages/Inicio.jsx';
import Mais from './pages/Mais.jsx';
import MinhaMoto from './pages/MinhaMoto.jsx';
import Km from './pages/Km.jsx';
import Combustivel from './pages/Combustivel.jsx';
import Metas from './pages/Metas.jsx';
import Relatorios from './pages/Relatorios.jsx';
import Configuracoes from './pages/Configuracoes.jsx';
import { useEffect } from 'react';
import { useConfig } from './config.js';
import Salario from './pages/Salario.jsx';
import Lancamentos from './pages/Lancamentos.jsx';

export default function App() {
  const tema = useConfig('tema', 'escuro');
  const paleta = useConfig('paleta', 'verde');
  useEffect(() => {
    document.documentElement.dataset.tema = tema === 'claro' ? 'claro' : 'escuro';
    document.documentElement.dataset.paleta = paleta === 'vermelho' ? 'vermelho' : 'verde';
  }, [tema, paleta]);
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/ganhos" element={<Lancamentos tipo="ganho" />} />
        <Route path="/despesas" element={<Lancamentos tipo="despesa" />} />
        <Route path="/moto" element={<MinhaMoto />} />
        <Route path="/km" element={<Km />} />
        <Route path="/combustivel" element={<Combustivel />} />
        <Route path="/metas" element={<Metas />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/config" element={<Configuracoes />} />
        <Route path="/salario" element={<Salario />} />
        <Route path="/mais" element={<Mais />} />
        <Route path="*" element={<Inicio />} />
      </Routes>
    </Layout>
  );
}
