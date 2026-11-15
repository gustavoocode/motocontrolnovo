import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { dataCurta, reais } from '../lib.js';

export default function SalarioResumo() {
  const d = useLiveQuery(async () => ({ s: await db.salario.get(1), l: await db.lanches.toArray() }), []);
  if (!d?.s?.valor) return null;
  const desc = d.l.filter((l) => !l.recebimentoId).reduce((s, l) => s + l.valor, 0), liq = d.s.valor - desc;
  return (
    <p className="resumo">
      <Link to="/salario">Salário</Link>: líquido previsto <b className={liq >= 0 ? 'verde' : 'vermelho'}>{reais(liq)}</b>
      {d.s.dataPrevista ? ` em ${dataCurta(d.s.dataPrevista)}` : ''}
    </p>
  );
}
