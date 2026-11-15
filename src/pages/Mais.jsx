import { Link } from 'react-router-dom';
import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { db, exportarBackup, importarBackup } from '../db.js';
import { hojeISO } from '../lib.js';

function baixar(file) {
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: file.name });
  a.click();
  URL.revokeObjectURL(url);
}

export default function Mais() {
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const entrada = useRef(null);

  async function exportar() {
    setOcupado(true); setMsg(null);
    try {
      const obj = await exportarBackup();
      const file = new File([JSON.stringify(obj)], `motocontrol-backup-${hojeISO()}.json`, { type: 'application/json' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
      else baixar(file);
      await db.config.put({ chave: 'ultimoBackup', valor: new Date().toISOString() });
      setMsg({ ok: 'Backup exportado.' });
    } catch (e) {
      if (e.name !== 'AbortError') setMsg({ erro: 'Não foi possível exportar o backup. Tente de novo.' });
    } finally { setOcupado(false); }
  }

  async function restaurar(ev) {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    setMsg(null);
    try {
      const obj = JSON.parse(await file.text());
      if (!window.confirm('Restaurar vai substituir todos os dados atuais deste aparelho. Continuar?')) return;
      setOcupado(true);
      await importarBackup(obj);
      setMsg({ ok: 'Backup restaurado.' });
    } catch (e) {
      setMsg({ erro: e instanceof SyntaxError ? 'O arquivo está corrompido ou não é um backup.' : e.message });
    } finally { setOcupado(false); }
  }

  return (
    <>
      <h1>Mais</h1>
      <ul className="lista">
        <li><Link to="/moto">Minha moto e manutenção</Link></li>
        <li><Link to="/km">Quilometragem</Link></li>
        <li><Link to="/combustivel">Combustível</Link></li>
        <li><Link to="/salario">Salário</Link></li>
        <li><Link to="/metas">Metas</Link></li>
        <li><Link to="/relatorios">Relatórios</Link></li>
        <li><Link to="/config">Configurações</Link></li>
      </ul>
      <h2>Backup</h2>
      <p className="mudo">Seus dados ficam só neste iPhone. Exporte um backup de tempos em tempos e guarde o arquivo no app Arquivos ou no iCloud.</p>
      <div className="acoes">
        <button onClick={exportar} disabled={ocupado}><Download size={18} aria-hidden="true" /> Exportar backup</button>
        <button className="sec" onClick={() => entrada.current.click()} disabled={ocupado}><Upload size={18} aria-hidden="true" /> Restaurar backup</button>
        <input ref={entrada} type="file" accept="application/json,.json" hidden onChange={restaurar} />
      </div>
      {msg && <p role="status" className={msg.ok ? 'msg ok' : 'msg erro'}>{msg.ok || msg.erro}</p>}
    </>
  );
}
