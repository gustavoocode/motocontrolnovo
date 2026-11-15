import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.js';

export const setConfig = (chave, valor) => db.config.put({ chave, valor });
export function useConfig(chave, padrao) {
  const r = useLiveQuery(async () => ({ v: (await db.config.get(chave))?.valor }), [chave]);
  return r && r.v !== undefined ? r.v : padrao;
}
