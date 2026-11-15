import Dexie from 'dexie';

export const db = new Dexie('motocontrol');
db.version(1).stores({
  ganhos: '++id, data, plataforma',
  despesas: '++id, data, categoria, origem', // fonte única de despesas (abastecimento e manutenção apontam para ela)
  abastecimentos: '++id, data, despesaId',
  manutencoes: '++id, data, despesaId, proximaData',
  kms: '++id, data',
  moto: 'id',
  metas: 'id',
  config: 'chave',
});

db.version(2).stores({
  salario: 'id',
  lanches: '++id, data, recebimentoId',
  recebimentos: '++id, data',
});

const TABELAS = ['ganhos', 'despesas', 'abastecimentos', 'manutencoes', 'kms', 'moto', 'metas', 'config', 'salario', 'lanches', 'recebimentos'];

export async function exportarBackup() {
  const dados = {};
  for (const t of TABELAS) dados[t] = await db.table(t).toArray();
  return { app: 'MotoControl', versao: 1, exportadoEm: new Date().toISOString(), dados };
}

export async function importarBackup(obj) {
  if (obj?.app !== 'MotoControl' || typeof obj.dados !== 'object') {
    throw new Error('Este arquivo não é um backup do MotoControl.');
  }
  await db.transaction('rw', TABELAS.map((t) => db.table(t)), async () => {
    for (const t of TABELAS) {
      await db.table(t).clear();
      await db.table(t).bulkAdd(obj.dados[t] ?? []);
    }
  });
}
