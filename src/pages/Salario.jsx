import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil, Trash2 } from 'lucide-react';
import { db } from '../db.js';
import { hojeISO, paraCentavos, valorTxt, dataCurta, reais } from '../lib.js';

function Folha({ titulo, aoFechar, onSubmit, erro, children }) {
  return (
    <div className="folha" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <form onSubmit={onSubmit} noValidate>
        <h1>{titulo}</h1>
        {children}
        {erro && <p role="alert" className="msg erro">{erro}</p>}
        <div className="acoes"><button>Salvar</button><button type="button" className="sec" onClick={aoFechar}>Cancelar</button></div>
      </form>
    </div>
  );
}

function FormLanche({ item, aoFechar }) {
  const [f, setF] = useState({ data: item?.data ?? hojeISO(), descricao: item?.descricao ?? '', valor: item ? valorTxt(item.valor) : '' });
  const [erro, setErro] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function salvar(e) {
    e.preventDefault();
    const valor = paraCentavos(f.valor);
    if (!f.descricao.trim()) return setErro('Informe o que você pegou.');
    if (!Number.isFinite(valor) || valor <= 0) return setErro('Informe um valor maior que zero.');
    if (!f.data) return setErro('Informe a data.');
    await db.lanches.put({ ...item, data: f.data, descricao: f.descricao.trim(), valor });
    aoFechar();
  }
  return (
    <Folha titulo={`${item ? 'Editar' : 'Registrar'} lanche`} aoFechar={aoFechar} onSubmit={salvar} erro={erro}>
      <label>Descrição<input value={f.descricao} onChange={set('descricao')} autoFocus /></label>
      <label>Valor (R$)<input inputMode="decimal" value={f.valor} onChange={set('valor')} placeholder="0,00" /></label>
      <label>Data<input type="date" value={f.data} onChange={set('data')} /></label>
    </Folha>
  );
}

function FormReceber({ bruto, desconto, ids, aoFechar }) {
  const sugerido = Math.max(0, bruto - desconto);
  const [f, setF] = useState({ data: hojeISO(), valor: valorTxt(sugerido) });
  const [erro, setErro] = useState('');
  async function salvar(e) {
    e.preventDefault();
    const valor = paraCentavos(f.valor);
    if (!Number.isFinite(valor) || valor < 0) return setErro('Informe o valor que caiu na conta.');
    if (!f.data) return setErro('Informe a data.');
    await db.transaction('rw', db.recebimentos, db.lanches, db.salario, async () => {
      const rid = await db.recebimentos.add({ data: f.data, valor, bruto, descontoLanches: desconto });
      for (const id of ids) await db.lanches.update(id, { recebimentoId: rid });
      await db.salario.put({ id: 1, valor: 0, dataPrevista: '' });
    });
    aoFechar();
  }
  return (
    <Folha titulo="Marcar como recebido" aoFechar={aoFechar} onSubmit={salvar} erro={erro}>
      <p className="mudo">A receber {reais(bruto)} − lanches {reais(desconto)} = sugerido {reais(sugerido)}. Confirme o valor que você recebeu de verdade.</p>
      <label>Valor recebido (R$)<input inputMode="decimal" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} autoFocus /></label>
      <label>Data do recebimento<input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></label>
    </Folha>
  );
}

function FormSalario({ s }) {
  const [f, setF] = useState({ valor: s?.valor ? valorTxt(s.valor) : '', data: s?.dataPrevista ?? '' });
  const [msg, setMsg] = useState(null);
  async function salvar(e) {
    e.preventDefault();
    const v = f.valor === '' ? 0 : paraCentavos(f.valor);
    if (!Number.isFinite(v) || v < 0) return setMsg({ erro: 'Informe um valor válido.' });
    await db.salario.put({ id: 1, valor: v, dataPrevista: f.data });
    setMsg({ ok: 'Salário a receber salvo.' });
  }
  return (
    <form onSubmit={salvar} className="bloco" noValidate>
      <label>Salário a receber (R$)<input inputMode="decimal" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} placeholder="0,00" /></label>
      <label>Data prevista (opcional)<input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></label>
      <button className="sec">Salvar valor a receber</button>
      {msg && <p role="status" className={msg.ok ? 'msg ok' : 'msg erro'}>{msg.ok || msg.erro}</p>}
    </form>
  );
}

export default function Salario() {
  const [lanche, setLanche] = useState(undefined); // undefined fechado, null novo, objeto edição
  const [receber, setReceber] = useState(false);
  const d = useLiveQuery(async () => ({ s: await db.salario.get(1), l: await db.lanches.toArray(), r: await db.recebimentos.orderBy('data').reverse().toArray() }), []);
  if (!d) return <p className="mudo">Carregando…</p>;
  const bruto = d.s?.valor || 0;
  const pend = d.l.filter((l) => !l.recebimentoId).sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);
  const desconto = pend.reduce((s, l) => s + l.valor, 0), liquido = bruto - desconto;
  const excluirLanche = async (l) => { if (window.confirm('Excluir este lanche?')) await db.lanches.delete(l.id); };
  const excluirRec = async (r) => {
    if (!window.confirm('Excluir este recebimento? Os lanches dele voltam para a lista de pendentes.')) return;
    await db.transaction('rw', db.recebimentos, db.lanches, async () => {
      await db.lanches.where('recebimentoId').equals(r.id).modify({ recebimentoId: null });
      await db.recebimentos.delete(r.id);
    });
  };
  return (
    <>
      <h1>Salário</h1>
      <ul className="lista">
        <li><span>Salário a receber{d.s?.dataPrevista ? <small>previsto {dataCurta(d.s.dataPrevista)}</small> : null}</span><b>{reais(bruto)}</b></li>
        <li><span>Lanches pendentes</span><b className="vermelho">− {reais(desconto)}</b></li>
        <li><span>Líquido previsto</span><b className={liquido >= 0 ? 'verde' : 'vermelho'}>{reais(liquido)}</b></li>
      </ul>
      <FormSalario key={d.r.length} s={d.s} />
      <div className="acoes">
        <button disabled={bruto <= 0} onClick={() => setReceber(true)}>Marcar como recebido</button>
      </div>
      {bruto <= 0 && <p className="mudo">Informe o salário a receber para poder marcar como recebido.</p>}

      <h2>Lanches pendentes</h2>
      <div className="acoes"><button className="sec" onClick={() => setLanche(null)}>Registrar lanche</button></div>
      {pend.length === 0 ? <p className="mudo">Nenhum lanche pendente.</p> : (
        <ul className="lista">
          {pend.map((l) => (
            <li key={l.id}>
              <span>{l.descricao}<small>{dataCurta(l.data)}</small></span>
              <span className="fim"><b>{reais(l.valor)}</b>
                <button className="icone" aria-label="Editar" onClick={() => setLanche(l)}><Pencil size={18} /></button>
                <button className="icone" aria-label="Excluir" onClick={() => excluirLanche(l)}><Trash2 size={18} /></button></span>
            </li>
          ))}
        </ul>
      )}

      <h2>Recebimentos</h2>
      {d.r.length === 0 ? <p className="mudo">Nenhum recebimento registrado.</p> : (
        <ul className="lista">
          {d.r.map((r) => (
            <li key={r.id}>
              <span>{dataCurta(r.data)}<small>previsto {reais(r.bruto)} · lanches descontados {reais(r.descontoLanches)}</small></span>
              <span className="fim"><b className="verde">{reais(r.valor)}</b>
                <button className="icone" aria-label="Excluir" onClick={() => excluirRec(r)}><Trash2 size={18} /></button></span>
            </li>
          ))}
        </ul>
      )}
      {lanche !== undefined && <FormLanche item={lanche} aoFechar={() => setLanche(undefined)} />}
      {receber && <FormReceber bruto={bruto} desconto={desconto} ids={pend.map((l) => l.id)} aoFechar={() => setReceber(false)} />}
    </>
  );
}
