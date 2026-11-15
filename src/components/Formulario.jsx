import { useState } from 'react';
import { db } from '../db.js';
import { PLATAFORMAS, CATEGORIAS, hojeISO, paraCentavos } from '../lib.js';

const txt = (c) => (c ? (c / 100).toFixed(2).replace('.', ',') : '');

export default function Formulario({ tipo, item, aoFechar }) {
  const ganho = tipo === 'ganho';
  const [f, setF] = useState(() => ({
    descricao: item?.descricao ?? '', valor: txt(item?.valor), gorjeta: txt(item?.gorjeta),
    data: item?.data ?? hojeISO(), horario: item?.horario ?? '', plataforma: item?.plataforma ?? PLATAFORMAS[0],
    entregas: item?.entregas || '', categoria: item?.categoria ?? CATEGORIAS[0], km: item?.km ?? '', obs: item?.obs ?? '',
  }));
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function salvar(e) {
    e.preventDefault();
    const valor = paraCentavos(f.valor);
    if (!Number.isFinite(valor) || valor <= 0) return setErro('Informe um valor maior que zero.');
    if (!f.data) return setErro('Informe a data.');
    const gorjeta = f.gorjeta ? paraCentavos(f.gorjeta) : 0;
    if (ganho && !Number.isFinite(gorjeta)) return setErro('A gorjeta precisa ser um número.');
    setSalvando(true);
    try {
      const base = { descricao: f.descricao.trim(), valor, data: f.data, obs: f.obs.trim() };
      if (ganho) await db.ganhos.put({ ...item, ...base, gorjeta, horario: f.horario, plataforma: f.plataforma, entregas: Number(f.entregas) || 0 });
      else await db.despesas.put({ ...item, ...base, categoria: f.categoria, km: f.km === '' ? null : Number(f.km), origem: item?.origem ?? 'manual' });
      aoFechar();
    } catch { setErro('Não foi possível salvar. Tente de novo.'); setSalvando(false); }
  }

  return (
    <div className="folha" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <form onSubmit={salvar} noValidate>
        <h1>{item ? 'Editar' : 'Registrar'} {ganho ? 'ganho' : 'despesa'}</h1>
        <label>Valor (R$)<input inputMode="decimal" value={f.valor} onChange={set('valor')} placeholder="0,00" autoFocus /></label>
        {ganho && <label>Gorjeta (R$)<input inputMode="decimal" value={f.gorjeta} onChange={set('gorjeta')} placeholder="0,00" /></label>}
        {ganho
          ? <label>Plataforma<select value={f.plataforma} onChange={set('plataforma')}>{PLATAFORMAS.map((p) => <option key={p}>{p}</option>)}</select></label>
          : <label>Categoria<select value={f.categoria} onChange={set('categoria')}>{CATEGORIAS.map((p) => <option key={p}>{p}</option>)}</select></label>}
        {ganho && <label>Entregas<input inputMode="numeric" value={f.entregas} onChange={set('entregas')} placeholder="0" /></label>}
        <label>Data<input type="date" value={f.data} onChange={set('data')} /></label>
        {ganho && <label>Horário (opcional)<input type="time" value={f.horario} onChange={set('horario')} /></label>}
        {!ganho && <label>Quilometragem (opcional)<input inputMode="numeric" value={f.km} onChange={set('km')} /></label>}
        <label>Descrição (opcional)<input value={f.descricao} onChange={set('descricao')} /></label>
        <label>Observações (opcional)<input value={f.obs} onChange={set('obs')} /></label>
        {erro && <p role="alert" className="msg erro">{erro}</p>}
        <div className="acoes">
          <button disabled={salvando}>Salvar</button>
          <button type="button" className="sec" onClick={aoFechar}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
