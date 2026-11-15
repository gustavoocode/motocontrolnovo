import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { hojeISO } from '../lib.js';
import Progresso from './Progresso.jsx';

export default function MetaDia() {
  const d = useLiveQuery(async () => ({ m: await db.metas.get(1), g: await db.ganhos.where('data').equals(hojeISO()).toArray() }), []);
  if (!d?.m?.diaria) return null;
  return <Progresso rotulo="Meta diária" atual={d.g.reduce((s, i) => s + i.valor + (i.gorjeta || 0), 0)} meta={d.m.diaria} />;
}
