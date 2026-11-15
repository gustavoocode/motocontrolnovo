import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil, Trash2 } from 'lucide-react';
import { db } from '../db.js';
import { hojeISO, paraCentavos, num, reais, dataCurta } from '../lib.js';
import { TIPOS, statusManutencoes, subirKm } from '../manutencao.js';

const ROTULO = { atrasada: 'Atrasada', proxima: 'Próxima', ok: 'Em dia' };
const txt = (c) => (c ? (c / 100).toFixed(2).replace('.', ',') : '');

function FormMoto({ moto }) {
  const [f, setF] = useState({ marca: '', modelo: '', ano: '', placa: '', kmAtual: '', tanque: '', consumo: '', ...moto });
  const [msg, setMsg] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function salvar(e) {
    e.preventDefault();
    await db.moto.put({ ...f, id: 1, kmAtual: Number(f.kmAtual) || 0 });
    setMsg('Dados da moto salvos.');
  }
  const campo = (k, r, extra = {}) => <label>{r}<input value={f[k]} onChange={set(k)} {...extra} /></label>;
  return (
    <form onSubmit={salvar} className="bloco">
      {campo('marca', 'Marca')}{campo('modelo', 'Modelo')}{campo('ano', 'Ano', { inputMode: 'numeric' })}{campo('placa', 'Placa')}
      {campo('kmAtual', 'Quilometragem atual', { inputMode: 'numeric' })}
      {campo('tanque', 'Capacidade do tanque (L)', { inputMode: 'decimal' })}{campo('consumo', 'Consumo médio (km/l)', { inputMode: 'decimal' })}
      <button>Salvar moto</button>
      {msg && <p role="status" className="msg ok">{msg}</p>}
    </form>
  );
}

function FormManut({ item, valorAtual, aoFechar }) {
  const [f, setF] = useState({ tipo: item?.tipo ?? TIPOS[0], descricao: item?.descricao ?? '', valor: txt(valorAtual), data: item?.data ?? hojeISO(), km: item?.km ?? '', proximaData: item?.proximaData ?? '', proximaKm: item?.proximaKm ?? '' });
  const [erro, setErro] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function salvar(e) {
    e.preventDefault();
    const valor = f.valor ? paraCentavos(f.valor) : 0;
    if (!Number.isFinite(valor) || valor < 0) return setErro('Informe um valor válido.');
    if (!f.data) return setErro('Informe a data.');
    const km = f.km === '' ? null : Number(f.km), proximaKm = f.proximaKm === '' ? null : Number(f.proximaKm);
    const m = { tipo: f.tipo, descricao: f.descricao.trim(), data: f.data, km, proximaData: f.proximaData, proximaKm };
    const d = { descricao: f.descricao.trim() || f.tipo, valor, categoria: 'Manutenção', data: f.data, km, origem: 'manutencao', obs: '' };
    try {
      await db.transaction('rw', db.manutencoes, db.despesas, db.moto, async () => {
        if (item) { await db.despesas.update(item.despesaId, d); await db.manutencoes.update(item.id, m); }
        else { const despesaId = await db.despesas.add(d); await db.manutencoes.add({ ...m, despesaId }); }
        await subirKm(db, km);
      });
      aoFechar();
    } catch { setErro('Não foi possível salvar. Tente de novo.'); }
  }
  return (
    <div className="folha" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <form onSubmit={salvar} noValidate>
        <h1>{item ? 'Editar' : 'Registrar'} manutenção</h1>
        <label>Tipo<select value={f.tipo} onChange={set('tipo')}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label>Valor gasto (R$)<input inputMode="decimal" value={f.valor} onChange={set('valor')} placeholder="0,00" /></label>
        <label>Data<input type="date" value={f.data} onChange={set('data')} /></label>
        <label>Quilometragem<input inputMode="numeric" value={f.km} onChange={set('km')} /></label>
        <label>Próxima manutenção (data)<input type="date" value={f.proximaData} onChange={set('proximaData')} /></label>
        <label>Próxima quilometragem<input inputMode="numeric" value={f.proximaKm} onChange={set('proximaKm')} /></label>
        <label>Descrição (opcional)<input value={f.descricao} onChange={set('descricao')} /></label>
        {erro && <p role="alert" className="msg erro">{erro}</p>}
        <div className="acoes"><button>Salvar</button><button type="button" className="sec" onClick={aoFechar}>Cancelar</button></div>
      </form>
    </div>
  );
}

export default function MinhaMoto() {
  const [edit, setEdit] = useState(undefined); // undefined fechado, null novo, objeto edição
  const d = useLiveQuery(async () => ({
    moto: await db.moto.get(1), m: await db.manutencoes.toArray(),
    ds: Object.fromEntries((await db.despesas.where('origem').equals('manutencao').toArray()).map((x) => [x.id, x.valor])),
  }), []);
  if (!d) return <p className="mudo">Carregando…</p>;
  const estado = Object.fromEntries(statusManutencoes(d.m, d.moto?.kmAtual || 0).map((x) => [x.id, x.estado]));
  const lista = [...d.m].sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);
  const excluir = async (m) => {
    if (!window.confirm('Excluir esta manutenção e a despesa ligada a ela?')) return;
    await db.transaction('rw', db.manutencoes, db.despesas, async () => { await db.despesas.delete(m.despesaId); await db.manutencoes.delete(m.id); });
  };
  return (
    <>
      <h1>Minha moto</h1>
      <FormMoto key={d.moto?.kmAtual} moto={d.moto} />
      <h2>Manutenções</h2>
      <button onClick={() => setEdit(null)}>Registrar manutenção</button>
      {lista.length === 0 ? <p className="mudo">Nenhuma manutenção registrada.</p> : (
        <ul className="lista">
          {lista.map((m) => (
            <li key={m.id}>
              <span>{m.tipo}{m.descricao ? ` · ${m.descricao}` : ''}
                <small>{dataCurta(m.data)}{m.km ? ` · ${m.km} km` : ''}{m.proximaData ? ` · próxima ${dataCurta(m.proximaData)}` : ''}{m.proximaKm ? ` · próxima aos ${m.proximaKm} km` : ''}</small>
                {estado[m.id] && estado[m.id] !== 'ok' && <small className={estado[m.id] === 'atrasada' ? 'vermelho' : 'ambar'}>{ROTULO[estado[m.id]]}</small>}
              </span>
              <span className="fim">
                <b>{reais(d.ds[m.despesaId] || 0)}</b>
                <button className="icone" aria-label="Editar" onClick={() => setEdit(m)}><Pencil size={18} /></button>
                <button className="icone" aria-label="Excluir" onClick={() => excluir(m)}><Trash2 size={18} /></button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {edit !== undefined && <FormManut item={edit} valorAtual={edit ? d.ds[edit.despesaId] : 0} aoFechar={() => setEdit(undefined)} />}
    </>
  );
}
