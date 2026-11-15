import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil, Trash2 } from 'lucide-react';
import { db } from '../db.js';
import { hojeISO, inicioMes, dataCurta, num, reais } from '../lib.js';
import { subirKm } from '../manutencao.js';

const TIPOS = ['Gasolina comum', 'Gasolina aditivada', 'Etanol'];

function Form({ item, preco, aoFechar }) {
  const [f, setF] = useState({ data: item?.data ?? hojeISO(), km: item?.km ?? '', litros: item?.litros ?? '', preco: item ? String((item.precoCentavos / 100).toFixed(2)).replace('.', ',') : '', tipo: item?.tipo ?? TIPOS[0] });
  const [erro, setErro] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const litros = num(f.litros), pc = Math.round(num(f.preco) * 100), total = Math.round(litros * pc);
  async function salvar(e) {
    e.preventDefault();
    if (f.km === '') return setErro('Informe a quilometragem do abastecimento.');
    if (!(litros > 0)) return setErro('Informe os litros abastecidos.');
    if (!(pc > 0)) return setErro('Informe o valor por litro.');
    const km = Number(f.km);
    const desp = { descricao: `Abastecimento · ${f.tipo}`, valor: total, categoria: 'Combustível', data: f.data, km, origem: 'abastecimento', obs: '' };
    const ab = { data: f.data, km, litros, precoCentavos: pc, tipo: f.tipo };
    await db.transaction('rw', db.abastecimentos, db.despesas, db.moto, async () => {
      if (item) { await db.despesas.update(item.despesaId, desp); await db.abastecimentos.update(item.id, ab); }
      else { const despesaId = await db.despesas.add(desp); await db.abastecimentos.add({ ...ab, despesaId }); }
      await subirKm(db, km);
    });
    aoFechar();
  }
  return (
    <div className="folha" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <form onSubmit={salvar} noValidate>
        <h1>{item ? 'Editar' : 'Registrar'} abastecimento</h1>
        <label>Data<input type="date" value={f.data} onChange={set('data')} /></label>
        <label>Quilometragem<input inputMode="numeric" value={f.km} onChange={set('km')} autoFocus /></label>
        <label>Litros<input inputMode="decimal" value={f.litros} onChange={set('litros')} /></label>
        <label>Valor por litro (R$)<input inputMode="decimal" value={f.preco} onChange={set('preco')} placeholder="0,00" /></label>
        <label>Combustível<select value={f.tipo} onChange={set('tipo')}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select></label>
        <p className="mudo">Valor total: <b>{total > 0 ? reais(total) : 'R$ 0,00'}</b></p>
        {erro && <p role="alert" className="msg erro">{erro}</p>}
        <div className="acoes"><button>Salvar</button><button type="button" className="sec" onClick={aoFechar}>Cancelar</button></div>
      </form>
    </div>
  );
}

export default function Combustivel() {
  const [edit, setEdit] = useState(undefined);
  const d = useLiveQuery(async () => ({
    l: await db.abastecimentos.toArray(),
    ds: Object.fromEntries((await db.despesas.where('origem').equals('abastecimento').toArray()).map((x) => [x.id, x.valor])),
  }), []);
  if (!d) return <p className="mudo">Carregando…</p>;
  const asc = [...d.l].sort((a, b) => a.km - b.km);
  // Consumo supõe tanque cheio em cada abastecimento: km desde o anterior ÷ litros deste.
  const trechos = asc.slice(1).map((a, i) => ({ id: a.id, kms: a.km - asc[i].km, litros: a.litros, valor: d.ds[a.despesaId] || 0 })).filter((t) => t.kms > 0);
  const kms = trechos.reduce((s, t) => s + t.kms, 0), litros = trechos.reduce((s, t) => s + t.litros, 0), valor = trechos.reduce((s, t) => s + t.valor, 0);
  const consumo = Object.fromEntries(trechos.map((t) => [t.id, t.kms / t.litros]));
  const mes = inicioMes();
  const gastoMes = d.l.filter((a) => a.data >= mes).reduce((s, a) => s + (d.ds[a.despesaId] || 0), 0);
  const lista = [...d.l].sort((a, b) => b.data.localeCompare(a.data) || b.km - a.km);
  const excluir = async (a) => {
    if (!window.confirm('Excluir este abastecimento e a despesa ligada a ele?')) return;
    await db.transaction('rw', db.abastecimentos, db.despesas, async () => { await db.despesas.delete(a.despesaId); await db.abastecimentos.delete(a.id); });
  };
  return (
    <>
      <h1>Combustível</h1>
      <ul className="lista">
        <li><span>Consumo médio</span><b>{kms ? `${(kms / litros).toFixed(1).replace('.', ',')} km/l` : '—'}</b></li>
        <li><span>Custo por km</span><b>{kms ? reais(Math.round(valor / kms)) : '—'}</b></li>
        <li><span>Gasto este mês</span><b className="vermelho">{reais(gastoMes)}</b></li>
      </ul>
      <div className="acoes"><button onClick={() => setEdit(null)}>Registrar abastecimento</button></div>
      {lista.length === 0 ? <p className="mudo">Nenhum abastecimento registrado. O consumo aparece a partir do segundo.</p> : (
        <ul className="lista">
          {lista.map((a) => (
            <li key={a.id}>
              <span>{a.tipo}<small>{dataCurta(a.data)} · {a.km} km · {a.litros} L{consumo[a.id] ? ` · ${consumo[a.id].toFixed(1).replace('.', ',')} km/l` : ''}</small></span>
              <span className="fim"><b>{reais(d.ds[a.despesaId] || 0)}</b>
                <button className="icone" aria-label="Editar" onClick={() => setEdit(a)}><Pencil size={18} /></button>
                <button className="icone" aria-label="Excluir" onClick={() => excluir(a)}><Trash2 size={18} /></button></span>
            </li>
          ))}
        </ul>
      )}
      {edit !== undefined && <Form item={edit} aoFechar={() => setEdit(undefined)} />}
    </>
  );
}
