import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Printer } from 'lucide-react';
import { db } from '../db.js';
import { useConfig } from '../config.js';
import { hojeISO, addDias, inicioMes, dataISO, dataCurta, reais, valorTxt, entregar } from '../lib.js';

const soma = (l) => l.reduce((s, i) => s + i.valor + (i.gorjeta || 0), 0);
const agrupar = (l, campo) => Object.entries(l.reduce((o, i) => ({ ...o, [i[campo]]: (o[i[campo]] || 0) + i.valor + (i.gorjeta || 0) }), {})).sort((a, b) => b[1] - a[1]);

function periodo(p, de, ate) {
  const hoje = hojeISO(), d = new Date();
  return {
    hoje: [hoje, hoje], 7: [addDias(hoje, -6), hoje], 30: [addDias(hoje, -29), hoje], mes: [inicioMes(), hoje],
    anterior: [dataISO(new Date(d.getFullYear(), d.getMonth() - 1, 1)), dataISO(new Date(d.getFullYear(), d.getMonth(), 0))],
    custom: [de, ate],
  }[p];
}

export default function Relatorios() {
  const [p, setP] = useState('mes');
  const [de, setDe] = useState(hojeISO()), [ate, setAte] = useState(hojeISO());
  const depr = useConfig('depreciacaoKm', 0);
  const d = useLiveQuery(async () => ({ g: await db.ganhos.toArray(), x: await db.despesas.toArray(), k: await db.kms.toArray(), r: await db.recebimentos.toArray() }), []);
  if (!d) return <p className="mudo">Carregando…</p>;
  const [ini, fim] = periodo(p, de, ate);
  const dentro = (i) => i.data >= ini && i.data <= fim;
  const g = d.g.filter(dentro), x = d.x.filter(dentro), k = d.k.filter(dentro);
  const sal = d.r.filter(dentro).reduce((s, i) => s + i.valor, 0);
  const fat = soma(g), desp = soma(x), lucro = fat - desp;
  const dias = new Set(g.map((i) => i.data)).size;
  const km = k.reduce((s, i) => s + i.kmFinal - i.kmInicial, 0), horas = k.reduce((s, i) => s + (i.horas || 0), 0);
  const nome = { hoje: 'Hoje', 7: 'Últimos 7 dias', 30: 'Últimos 30 dias', mes: 'Este mês', anterior: 'Mês anterior', custom: 'Período personalizado' }[p];

  async function csv() {
    const l = [['Tipo', 'Data', 'Descrição', 'Categoria ou plataforma', 'Valor (R$)', 'Gorjeta (R$)']];
    [...g.map((i) => ['Ganho', i.data, i.descricao || '', i.plataforma, valorTxt(i.valor), valorTxt(i.gorjeta || 0)]),
     ...x.map((i) => ['Despesa', i.data, i.descricao || '', i.categoria, valorTxt(i.valor), '']),
     ...d.r.filter(dentro).map((i) => ['Salário recebido', i.data, `Lanches descontados: ${valorTxt(i.descontoLanches)}`, '', valorTxt(i.valor), ''])].sort((a, b) => a[1].localeCompare(b[1])).forEach((r) => l.push(r));
    const texto = '\ufeff' + l.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    try { await entregar(new File([texto], `motocontrol-${ini}-a-${fim}.csv`, { type: 'text/csv' })); } catch { /* cancelado */ }
  }

  const linha = (r, v, cls = '') => <li><span>{r}</span><b className={cls}>{v}</b></li>;
  return (
    <>
      <h1>Relatórios</h1>
      <div className="filtros noprint">
        <select aria-label="Período" value={p} onChange={(e) => setP(e.target.value)}>
          <option value="hoje">Hoje</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option>
          <option value="mes">Este mês</option><option value="anterior">Mês anterior</option><option value="custom">Período personalizado</option>
        </select>
        {p === 'custom' && <><input type="date" aria-label="De" value={de} onChange={(e) => setDe(e.target.value)} /><input type="date" aria-label="Até" value={ate} onChange={(e) => setAte(e.target.value)} /></>}
      </div>
      <p className="resumo">{nome} · {dataCurta(ini)} a {dataCurta(fim)}</p>
      <ul className="lista">
        {linha('Faturamento', reais(fat), 'verde')}{linha('Despesas', reais(desp), 'vermelho')}
        {linha('Lucro líquido (operacional)', reais(lucro), lucro >= 0 ? 'verde' : 'vermelho')}
        {depr > 0 && km > 0 && linha('Lucro estimado após depreciação', reais(lucro - Math.round(depr * km)), lucro - depr * km >= 0 ? 'verde' : 'vermelho')}
        {sal > 0 && linha('Salário recebido', reais(sal), 'verde')}
        {sal > 0 && linha('Total recebido (entregas + salário)', reais(fat + sal), 'verde')}
        {linha('Média de faturamento por dia trabalhado', dias ? reais(Math.round(fat / dias)) : '—')}
        {linha('Média de lucro por dia trabalhado', dias ? reais(Math.round(lucro / dias)) : '—')}
        {linha('Lucro por hora trabalhada', horas > 0 ? reais(Math.round(lucro / horas)) : '—')}
        {linha('Quilômetros rodados', `${km} km`)}
        {linha('Custo por quilômetro', km > 0 ? reais(Math.round(desp / km)) : '—')}
      </ul>
      <h2>Gastos por categoria</h2>
      {x.length === 0 ? <p className="mudo">Nenhuma despesa no período.</p> : <ul className="lista">{agrupar(x, 'categoria').map(([c, v]) => linha(`${c} · ${Math.round((v / desp) * 100)}%`, reais(v), 'vermelho'))}</ul>}
      <h2>Ganhos por plataforma</h2>
      {g.length === 0 ? <p className="mudo">Nenhum ganho no período.</p> : <ul className="lista">{agrupar(g, 'plataforma').map(([c, v]) => linha(`${c} · ${Math.round((v / fat) * 100)}%`, reais(v), 'verde'))}</ul>}
      <div className="acoes noprint">
        <button onClick={csv}><Download size={18} aria-hidden="true" /> Exportar CSV</button>
        <button className="sec" onClick={() => window.print()}><Printer size={18} aria-hidden="true" /> Exportar PDF</button>
      </div>
      <p className="mudo noprint">No PDF, escolha "Salvar como PDF" ou compartilhe pela tela que abrir.</p>
    </>
  );
}
