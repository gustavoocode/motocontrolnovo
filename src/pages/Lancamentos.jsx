import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil, Trash2 } from 'lucide-react';
import { db } from '../db.js';
import { PLATAFORMAS, CATEGORIAS, hojeISO, addDias, inicioMes, dataCurta, reais } from '../lib.js';
import Formulario from '../components/Formulario.jsx';

export default function Lancamentos({ tipo }) {
  const ganho = tipo === 'ganho';
  const tabela = ganho ? db.ganhos : db.despesas;
  const campo = ganho ? 'plataforma' : 'categoria';
  const [per, setPer] = useState('mes');
  const [filtro, setFiltro] = useState('');
  const [edit, setEdit] = useState(null);
  const lista = useLiveQuery(() => tabela.orderBy('data').reverse().toArray(), [ganho]);
  if (!lista) return <p className="mudo">Carregando…</p>;

  const hoje = hojeISO();
  const ini = { hoje, 7: addDias(hoje, -6), 30: addDias(hoje, -29), mes: inicioMes(), tudo: '' }[per];
  const vis = lista.filter((i) => (!ini || i.data >= ini) && (!filtro || i[campo] === filtro));
  const valorDe = (i) => i.valor + (ganho ? i.gorjeta || 0 : 0);
  const total = vis.reduce((s, i) => s + valorDe(i), 0);
  const livre = (i) => !i.origem || i.origem === 'manual';
  const excluir = async (i) => {
    if (window.confirm('Excluir este lançamento? Essa ação não pode ser desfeita.')) await tabela.delete(i.id);
  };

  return (
    <>
      <h1>{ganho ? 'Ganhos' : 'Despesas'}</h1>
      <div className="filtros">
        <select aria-label="Período" value={per} onChange={(e) => setPer(e.target.value)}>
          <option value="hoje">Hoje</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option>
          <option value="mes">Este mês</option><option value="tudo">Tudo</option>
        </select>
        <select aria-label={ganho ? 'Plataforma' : 'Categoria'} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">{ganho ? 'Todas as plataformas' : 'Todas as categorias'}</option>
          {(ganho ? PLATAFORMAS : CATEGORIAS).map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>
      <p className="resumo">Total: <b className={ganho ? 'verde' : 'vermelho'}>{reais(total)}</b> · {vis.length} {vis.length === 1 ? 'registro' : 'registros'}</p>
      {vis.length === 0 ? (
        <p className="mudo">Nenhum {ganho ? 'ganho' : 'gasto'} neste filtro. Toque em + para registrar.</p>
      ) : (
        <ul className="lista">
          {vis.map((i) => (
            <li key={i.id}>
              <span>{i.descricao || i[campo]}<small>{dataCurta(i.data)} · {i[campo]}{ganho && i.entregas ? ` · ${i.entregas} entregas` : ''}{livre(i) ? '' : ` · editar em ${i.origem === 'abastecimento' ? 'Combustível' : 'Minha moto'}`}</small></span>
              <span className="fim">
                <b className={ganho ? 'verde' : 'vermelho'}>{reais(valorDe(i))}</b>
                <button className="icone" aria-label="Editar" disabled={!livre(i)} onClick={() => setEdit(i)}><Pencil size={18} /></button>
                <button className="icone" aria-label="Excluir" disabled={!livre(i)} onClick={() => excluir(i)}><Trash2 size={18} /></button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {edit && <Formulario tipo={tipo} item={edit} aoFechar={() => setEdit(null)} />}
    </>
  );
}
