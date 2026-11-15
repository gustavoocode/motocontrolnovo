import { hojeISO, addDias } from './lib.js';

export const TIPOS = ['Troca de óleo', 'Relação', 'Pneus', 'Pastilhas de freio', 'Filtros', 'Velas', 'Bateria', 'Revisão geral', 'Outros'];

// Só a manutenção mais recente de cada tipo conta para o alerta.
export function statusManutencoes(lista, kmAtual) {
  const hoje = hojeISO(), limite = addDias(hoje, 15), ultima = {};
  for (const m of lista) {
    const chave = m.tipo + (m.tipo === 'Outros' ? m.descricao : '');
    const u = ultima[chave];
    if (!u || m.data > u.data || (m.data === u.data && m.id > u.id)) ultima[chave] = m;
  }
  return Object.values(ultima).filter((m) => m.proximaData || m.proximaKm).map((m) => {
    const atrasada = (m.proximaData && m.proximaData < hoje) || (m.proximaKm && kmAtual >= m.proximaKm);
    const proxima = (m.proximaData && m.proximaData <= limite) || (m.proximaKm && kmAtual >= m.proximaKm - 500);
    return { ...m, estado: atrasada ? 'atrasada' : proxima ? 'proxima' : 'ok' };
  });
}

export async function subirKm(db, km) {
  const mo = await db.moto.get(1);
  if (km && km > (mo?.kmAtual || 0)) await db.moto.put({ ...mo, id: 1, kmAtual: km });
}
