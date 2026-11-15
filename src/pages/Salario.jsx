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

function FormItem({ tipo, item, aoFechar }) {
  const lanche = tipo === 'lanche';
  const [f, setF] = useState({ data: item?.data ?? hojeISO(), valor: item ? valorTxt(item.valor) : '', texto: (lanche ? item?.descricao : item?.obs) ?? '' });
  const [erro, setErro] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function salvar(e) {
    e.preventDefault();
    const valor = paraCentavos(f.valor);
    if (lanche && !f.texto.trim()) return setErro('Informe o que você pegou.');
    if (!Number.isFinite(valor) || valor <= 0) return setErro('Informe um valor maior que zero.');
    if (!f.data) return setErro('Informe a data.');
    if (lanche) await db.lanches.put({ ...item, data: f.data, descricao: f.texto.trim(), valor });
    else await db.recebimentos.put({ ...item, data: f.data, valor, obs: f.texto.trim() });
    aoFechar();
  }
  return (
    <Folha titulo={`${item ? 'Editar' : 'Registrar'} ${lanche ? 'lanche' : 'pagamento recebido'}`} aoFechar={aoFechar} onSubmit={salvar} erro={erro}>
      <label>Valor (R$)<input inputMode="decimal" value={f.valor} onChange={set('valor')} placeholder="0,00" autoFocus /></label>
      <label>Data<input type="date" value={f.data} onChange={set('data')} /></label>
      <label>{lanche ? 'O que você pegou' : 'Observação (opcional)'}<input value={f.texto} onChange={set('texto')} /></label>
    </Folha>
  );
}

function FormTotal({ total }) {
  const [v, setV] = useState(total ? valorTxt(total) : '');
  const [msg, setMsg] = useState(null);
  async function salvar(e) {
    e.preventDefault();
    const c = v === '' ? 0 : paraCentavos(v);
    if (!Number.isFinite(c) || c < 0) return setMsg({ erro: 'Informe um valor válido.' });
    await db.salario.put({ id: 1, valor: c });
    setMsg({ ok: 'Total do salário salvo.' });
  }
  return (
    <form onSubmit={salvar} className="bloco" noValidate>
      <label>Total do salário neste período (R$)<input inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} placeholder="0,00" /></label>
      <button>Salvar total</button>
      {msg && <p role="status" className={msg.ok ? 'msg ok' : 'msg erro'}>{msg.ok || msg.erro}</p>}
    </form>
  );
}

export default function Salario() {
  const [aba, setAba] = useState('resumo');
  const [edit, setEdit] = useState(undefined); // undefined fechado, null novo, objeto edição
  const d = useLiveQuery(async () => ({ s: await db.salario.get(1), l: await db.lanches.toArray(), r: await db.recebimentos.toArray(), p: await db.periodos.orderBy('fim').reverse().toArray() }), []);
  if (!d) return <p className="mudo">Carregando…</p>;
  const ord = (a, b) => b.data.localeCompare(a.data) || b.id - a.id;
  const lan = d.l.filter((x) => !x.fechado && !x.recebimentoId).sort(ord), pag = d.r.filter((x) => !x.fechado).sort(ord);
  const total = d.s?.valor || 0, desc = lan.reduce((s, x) => s + x.valor, 0), pago = pag.reduce((s, x) => s + x.valor, 0);
  const aReceber = total - desc, falta = aReceber - pago;
  const apagar = async (tabela, texto, x) => { if (window.confirm(texto)) await db[tabela].delete(x.id); };
  async function encerrar() {
    if (!window.confirm('Encerrar este período? O total, os lanches e os pagamentos vão para o histórico e a conta recomeça zerada.')) return;
    await db.transaction('rw', db.periodos, db.lanches, db.recebimentos, db.salario, async () => {
      await db.periodos.add({ fim: hojeISO(), total, lanches: desc, pago });
      for (const x of lan) await db.lanches.update(x.id, { fechado: true });
      for (const x of pag) await db.recebimentos.update(x.id, { fechado: true });
      await db.salario.put({ id: 1, valor: 0 });
    });
  }
  const linha = (r, v, cls = '') => <li><span>{r}</span><b className={cls}>{v}</b></li>;
  const lista = (itens, tabela, tipo, nomeDe, valorCls) => itens.length === 0 ? <p className="mudo">Nada registrado ainda.</p> : (
    <ul className="lista">
      {itens.map((x) => (
        <li key={x.id}>
          <span>{nomeDe(x)}<small>{dataCurta(x.data)}</small></span>
          <span className="fim"><b className={valorCls}>{reais(x.valor)}</b>
            <button className="icone" aria-label="Editar" onClick={() => setEdit({ tipo, item: x })}><Pencil size={18} /></button>
            <button className="icone" aria-label="Excluir" onClick={() => apagar(tabela, `Excluir este ${tipo === 'lanche' ? 'lanche' : 'pagamento'}?`, x)}><Trash2 size={18} /></button></span>
        </li>
      ))}
    </ul>
  );
  return (
    <>
      <h1>Salário</h1>
      <div className="abas" role="tablist">
        {[['resumo', 'Resumo'], ['pagamentos', 'Pagamentos'], ['lanches', 'Lanches']].map(([k, r]) => (
          <button key={k} role="tab" className="aba" aria-selected={aba === k} onClick={() => setAba(k)}>{r}</button>
        ))}
      </div>

      {aba === 'resumo' && (
        <>
          <ul className="lista">
            {linha('Total do salário', reais(total))}
            {linha('Lanches descontados', `− ${reais(desc)}`, 'vermelho')}
            {linha('Total a receber', reais(aReceber), aReceber >= 0 ? '' : 'vermelho')}
            {linha('Já recebido', `− ${reais(pago)}`, 'verde')}
            {linha(falta < 0 ? 'Recebido a mais' : 'Falta receber', reais(Math.abs(falta)), falta <= 0 ? 'verde' : '')}
          </ul>
          <FormTotal key={d.p.length} total={total} />
          {(total > 0 || lan.length > 0 || pag.length > 0) && (
            <div className="acoes"><button className="sec" onClick={encerrar}>Encerrar período</button></div>
          )}
          <h2>Períodos encerrados</h2>
          {d.p.length === 0 ? <p className="mudo">Nenhum período encerrado ainda.</p> : (
            <ul className="lista">
              {d.p.map((p) => (
                <li key={p.id}><span>Até {dataCurta(p.fim)}<small>total {reais(p.total)} · lanches {reais(p.lanches)}</small></span><b className="verde">{reais(p.pago)}</b></li>
              ))}
            </ul>
          )}
        </>
      )}

      {aba === 'pagamentos' && (
        <>
          <p className="mudo">Cada vez que o dinheiro cair, registre aqui. Total recebido: <b className="verde">{reais(pago)}</b></p>
          <div className="acoes"><button onClick={() => setEdit({ tipo: 'pagamento', item: null })}>Registrar pagamento recebido</button></div>
          {lista(pag, 'recebimentos', 'pagamento', (x) => x.obs || 'Pagamento', 'verde')}
        </>
      )}

      {aba === 'lanches' && (
        <>
          <p className="mudo">Tudo que você pegou e vai ser descontado. Total: <b className="vermelho">{reais(desc)}</b></p>
          <div className="acoes"><button onClick={() => setEdit({ tipo: 'lanche', item: null })}>Registrar lanche</button></div>
          {lista(lan, 'lanches', 'lanche', (x) => x.descricao, 'vermelho')}
        </>
      )}
      {edit && <FormItem tipo={edit.tipo} item={edit.item} aoFechar={() => setEdit(undefined)} />}
    </>
  );
}
