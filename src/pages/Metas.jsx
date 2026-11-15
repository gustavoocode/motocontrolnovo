import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { hojeISO, inicioMes, inicioSemana, paraCentavos, valorTxt } from '../lib.js';
import Progresso from '../components/Progresso.jsx';

const CAMPOS = [['diaria', 'Meta diária (R$)'], ['semanal', 'Meta semanal (R$)'], ['mensal', 'Meta mensal (R$)'], ['economia', 'Meta de economia por mês (R$)'], ['objetivo', 'Objetivo de faturamento (R$)']];
const soma = (l) => l.reduce((s, i) => s + i.valor + (i.gorjeta || 0), 0);

function Form({ m }) {
  const [f, setF] = useState(() => ({ ...Object.fromEntries(CAMPOS.map(([k]) => [k, m?.[k] ? valorTxt(m[k]) : ''])), prazo: m?.prazo ?? '' }));
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function salvar(e) {
    e.preventDefault();
    const v = {};
    for (const [k, r] of CAMPOS) {
      v[k] = f[k] === '' ? 0 : paraCentavos(f[k]);
      if (!Number.isFinite(v[k]) || v[k] < 0) return setMsg({ erro: `${r.replace(' (R$)', '')}: informe um valor válido.` });
    }
    const novoObj = v.objetivo !== (m?.objetivo || 0);
    await db.metas.put({ ...m, id: 1, ...v, prazo: f.prazo, objetivoInicio: novoObj || !m?.objetivoInicio ? hojeISO() : m.objetivoInicio });
    setMsg({ ok: 'Metas salvas.' });
  }
  return (
    <form onSubmit={salvar} className="bloco" noValidate>
      {CAMPOS.map(([k, r]) => <label key={k}>{r}<input inputMode="decimal" value={f[k]} onChange={set(k)} placeholder="0,00" /></label>)}
      <label>Prazo do objetivo (opcional)<input type="date" value={f.prazo} onChange={set('prazo')} /></label>
      <button>Salvar metas</button>
      {msg && <p role="status" className={msg.ok ? 'msg ok' : 'msg erro'}>{msg.ok || msg.erro}</p>}
    </form>
  );
}

export default function Metas() {
  const d = useLiveQuery(async () => ({ m: await db.metas.get(1), g: await db.ganhos.toArray(), x: await db.despesas.toArray() }), []);
  if (!d) return <p className="mudo">Carregando…</p>;
  const { m, g, x } = d, hoje = hojeISO(), mes = inicioMes(), sem = inicioSemana();
  const fatMes = soma(g.filter((i) => i.data >= mes)), despMes = soma(x.filter((i) => i.data >= mes));
  const fatObj = m?.objetivoInicio ? soma(g.filter((i) => i.data >= m.objetivoInicio)) : 0;
  return (
    <>
      <h1>Metas</h1>
      <Form key={m?.objetivoInicio ?? 'novo'} m={m} />
      <h2>Progresso</h2>
      {!m || !(m.diaria || m.semanal || m.mensal || m.economia || m.objetivo) ? <p className="mudo">Defina uma meta acima para acompanhar o progresso.</p> : (
        <>
          {m.diaria > 0 && <Progresso rotulo="Hoje" atual={soma(g.filter((i) => i.data === hoje))} meta={m.diaria} />}
          {m.semanal > 0 && <Progresso rotulo="Esta semana (desde segunda)" atual={soma(g.filter((i) => i.data >= sem))} meta={m.semanal} />}
          {m.mensal > 0 && <Progresso rotulo="Este mês" atual={fatMes} meta={m.mensal} />}
          {m.economia > 0 && <Progresso rotulo="Economia do mês (lucro líquido)" atual={fatMes - despMes} meta={m.economia} />}
          {m.objetivo > 0 && <Progresso rotulo={`Objetivo de faturamento${m.prazo ? ` até ${m.prazo.split('-').reverse().join('/')}` : ''}`} atual={fatObj} meta={m.objetivo} />}
        </>
      )}
    </>
  );
}
