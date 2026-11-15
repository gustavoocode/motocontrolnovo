import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { useConfig } from '../config.js';
import { statusManutencoes } from '../manutencao.js';

export default function Alertas() {
  const d = useLiveQuery(async () => ({ m: await db.manutencoes.toArray(), moto: await db.moto.get(1) }), []);
  const ligado = useConfig('alertasManutencao', true);
  if (!d || !ligado) return null;
  const l = statusManutencoes(d.m, d.moto?.kmAtual || 0).filter((x) => x.estado !== 'ok');
  return l.map((m) => (
    <p key={m.id} className={`aviso ${m.estado === 'atrasada' ? 'atraso' : ''}`}>
      {m.tipo}: {m.estado === 'atrasada' ? 'atrasada' : 'próxima'}. <Link to="/moto">Ver Minha moto</Link>
    </p>
  ));
}
