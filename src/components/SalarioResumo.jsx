import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { reais } from '../lib.js';

export default function SalarioResumo() {
  const d = useLiveQuery(async () => ({ s: await db.salario.get(1), l: await db.lanches.toArray(), r: await db.recebimentos.toArray() }), []);
  if (!d?.s?.valor) return null;
  const desc = d.l.filter((x) => !x.fechado && !x.recebimentoId).reduce((s, x) => s + x.valor, 0);
  const pago = d.r.filter((x) => !x.fechado).reduce((s, x) => s + x.valor, 0);
  const falta = d.s.valor - desc - pago;
  return (
    <p className="resumo">
      <Link to="/salario">Salário</Link>: {falta >= 0 ? 'falta receber ' : 'recebido a mais '}
      <b>{reais(Math.abs(falta))}</b>
    </p>
  );
}
