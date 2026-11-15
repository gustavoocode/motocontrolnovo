import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil, Trash2 } from 'lucide-react';
import { db } from '../db.js';
import { hojeISO, addDias, inicioMes, dataCurta, num } from '../lib.js';
import { subirKm } from '../manutencao.js';

function Form({ item, kmSugerido, aoFechar }) {
  const [f, setF] = useState({ data: item?.data ?? hojeISO(), kmInicial: item?.kmInicial ?? kmSugerido ?? '', kmFinal: item?.kmFinal ?? '', horas: item?.horas ?? '' });
  const [erro, setErro] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const total = Number(f.kmFinal) - Number(f.kmInicial);
  async function salvar(e) {
    e.preventDefault();
    if (f.kmInicial === '' || f.kmFinal === '') return setErro('Informe o km inicial e o km final.');
    if (!(total > 0)) return setErro('O km final precisa ser maior que o km inicial.');
    if (f.horas !== '' && !(num(f.horas) >= 0)) return setErro('As horas precisam ser um número.');
    await db.kms.put({ ...item, data: f.data, kmInicial: Number(f.kmInicial), kmFinal: Number(f.kmFinal), horas: f.horas === '' ? null : num(f.horas) });
    await subirKm(db, Number(f.kmFinal));
    aoFechar();
  }
  return (
    <div className="folha" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <form onSubmit={salvar} noValidate>
        <h1>{item ? 'Editar' : 'Registrar'} quilometragem</h1>
        <label>Data<input type="date" value={f.data} onChange={set('data')} /></label>
        <label>Km inicial<input inputMode="numeric" value={f.kmInicial} onChange={set('kmInicial')} /></label>
        <label>Km final<input inputMode="numeric" value={f.kmFinal} onChange={set('kmFinal')} autoFocus /></label>
        <label>Horas trabalhadas (opcional)<input inputMode="decimal" value={f.horas} onChange={set('horas')} /></label>
        <p className="mudo">Total percorrido: <b>{total > 0 ? total : 0} km</b></p>
        {erro && <p role="alert" className="msg erro">{erro}</p>}
        <div className="acoes"><button>Salvar</button><button type="button" className="sec" onClick={aoFechar}>Cancelar</button></div>
      </form>
    </div>
  );
}

export default function Km() {
  const [edit, setEdit] = useState(undefined);
  const d = useLiveQuery(async () => ({ l: await db.kms.orderBy('data').reverse().toArray(), moto: await db.moto.get(1) }), []);
  if (!d) return <p className="mudo">Carregando…</p>;
  const hoje = hojeISO(), mes = inicioMes(), s7 = addDias(hoje, -6);
  const tot = (f) => d.l.filter(f).reduce((s, k) => s + k.kmFinal - k.kmInicial, 0);
  const diasMes = new Set(d.l.filter((k) => k.data >= mes).map((k) => k.data)).size;
  const kmMes = tot((k) => k.data >= mes);
  const excluir = async (k) => { if (window.confirm('Excluir este registro de quilometragem?')) await db.kms.delete(k.id); };
  return (
    <>
      <h1>Quilometragem</h1>
      <ul className="lista">
        <li><span>Hoje</span><b>{tot((k) => k.data === hoje)} km</b></li>
        <li><span>Últimos 7 dias</span><b>{tot((k) => k.data >= s7)} km</b></li>
        <li><span>Este mês</span><b>{kmMes} km</b></li>
        <li><span>Média por dia rodado</span><b>{diasMes ? Math.round(kmMes / diasMes) : 0} km</b></li>
      </ul>
      <div className="acoes"><button onClick={() => setEdit(null)}>Registrar quilometragem</button></div>
      {d.l.length === 0 ? <p className="mudo">Nenhum registro de rodagem.</p> : (
        <ul className="lista">
          {d.l.map((k) => (
            <li key={k.id}>
              <span>{dataCurta(k.data)}<small>{k.kmInicial} → {k.kmFinal}{k.horas ? ` · ${k.horas} h` : ''}</small></span>
              <span className="fim"><b>{k.kmFinal - k.kmInicial} km</b>
                <button className="icone" aria-label="Editar" onClick={() => setEdit(k)}><Pencil size={18} /></button>
                <button className="icone" aria-label="Excluir" onClick={() => excluir(k)}><Trash2 size={18} /></button></span>
            </li>
          ))}
        </ul>
      )}
      {edit !== undefined && <Form item={edit} kmSugerido={d.l[0]?.kmFinal ?? d.moto?.kmAtual} aoFechar={() => setEdit(undefined)} />}
    </>
  );
}
