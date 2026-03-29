'use client';

import { useState, useEffect } from 'react';
import { Upload, CheckCircle2, AlertCircle, Loader2, History, Search, UserCheck, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import contractsData from '@/lib/contracts.json';

type HistoryItem = {
  id: string;
  folio: string;
  supervisor: string;
  timestamp: string;
};

export default function Home() {
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('');
  const [contractId, setContractId] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [folio, setFolio] = useState('');
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    inicial: null,
    caja: null,
    terminado: null,
  });
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [compressionStatus, setCompressionStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const uniqueSupervisors = Array.from(new Set(contractsData.map(c => c.supervisor))).sort();

  useEffect(() => {
    const saved = localStorage.getItem('selectedSupervisor');
    if (saved) setSelectedSupervisor(saved);
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      if (res.status === 401) {
        setErrorMsg('AUTH_REQUIRED: El historial requiere re-autorización.');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error('Failed to fetch history', e);
    }
  };

  useEffect(() => {
    localStorage.setItem('selectedSupervisor', selectedSupervisor);
    const found = contractsData.find(c => c.id === contractId);
    if (found && selectedSupervisor && found.supervisor !== selectedSupervisor) {
      setContractId('');
    }
  }, [selectedSupervisor]);

  useEffect(() => {
    const found = contractsData.find(c => c.id === contractId);
    if (found) {
      setEmpresa(found.empresa);
      setSupervisor(found.supervisor);
    } else {
      setEmpresa('');
      setSupervisor('');
    }
  }, [contractId]);

  const handleFileChange = (phase: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [phase]: e.target.files![0] }));
    }
  };

  const isFormValid = contractId && empresa && folio.length === 4 && files.inicial && files.caja && files.terminado;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setStatus('uploading');
    setErrorMsg('');

    try {
      const fullFolio = `${contractId}${folio}`;
      const phases = ['inicial', 'caja', 'terminado'];
      
      const compressionOptions = {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      for (const phase of phases) {
        setCompressionStatus(`Optimizando fase ${phase}...`);
        
        const originalFile = files[phase]!;
        // Compress image before sending
        const compressedFile = await imageCompression(originalFile, compressionOptions);
        
        const formData = new FormData();
        formData.append('contract', contractId);
        formData.append('empresa', empresa);
        formData.append('supervisor', supervisor);
        formData.append('folio', fullFolio);
        formData.append('phase', phase);
        formData.append('file', compressedFile);

        let attempts = 0;
        let success = false;
        let lastErr = '';
        
        setCompressionStatus(`Subiendo fase ${phase}...`);

        while (attempts < 3 && !success) {
          try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || `Error phase ${phase}`);
            }
            success = true;
          } catch (err: any) {
            attempts++;
            lastErr = err.message;
            if (attempts < 3) await new Promise(r => setTimeout(r, 1000 * attempts));
          }
        }
        if (!success) throw new Error(lastErr);
      }

      setCompressionStatus('');
      setStatus('success');
      setFolio(''); 
      setFiles({ inicial: null, caja: null, terminado: null });
      fetchHistory();
      
      setTimeout(() => setStatus('idle'), 3000);
      
    } catch (err: any) {
      console.error(err);
      setCompressionStatus('');
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  const filteredContracts = selectedSupervisor 
    ? contractsData.filter(c => c.supervisor === selectedSupervisor)
    : contractsData;

  return (
    <main style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', color: 'var(--primary-glow)', marginBottom: '0.25rem', fontWeight: 800 }}>Bacheo Recovery</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Módulo de Carga Masiva - 3ra Etapa</p>
          </div>
          {status === 'uploading' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-glow)', fontSize: '0.875rem', fontWeight: 600 }}>
              <Zap size={16} className="animate-pulse" /> {compressionStatus}
            </div>
          )}
        </header>

        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--primary)', background: 'rgba(37, 99, 235, 0.05)' }}>
          <UserCheck size={24} color="var(--primary-glow)" />
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem', opacity: 0.7 }}>Soy el Supervisor:</label>
            <select 
              value={selectedSupervisor} 
              onChange={e => setSelectedSupervisor(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.1rem', width: '100%', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
            >
              <option value="" style={{ color: 'black' }}>-- Selecciona tu nombre --</option>
              {uniqueSupervisors.map(name => (
                <option key={name} value={name} style={{ color: 'black' }}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Contrato (Filtro Activo)</label>
              <div style={{ position: 'relative' }}>
                <input 
                  list="contracts-list"
                  className="input" 
                  placeholder="ID..." 
                  value={contractId} 
                  onChange={e => setContractId(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                  required 
                />
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <datalist id="contracts-list">
                  {filteredContracts.map(c => (
                    <option key={c.id} value={c.id}>{c.empresa}</option>
                  ))}
                </datalist>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Empresa</label>
              <input 
                className="input" 
                readOnly
                placeholder="Auto-completado" 
                value={empresa} 
                style={{ opacity: 0.8, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Folio del Bache</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
              <span style={{ padding: '0 0.75rem', color: 'var(--primary-glow)', borderRight: '1px solid var(--border)', fontWeight: 700 }}>{contractId || '---'}</span>
              <input 
                style={{ background: 'transparent', border: 'none', padding: '0.75rem', color: 'white', flex: 1, outline: 'none', fontSize: '1.25rem', letterSpacing: '0.15em' }}
                placeholder="0001" 
                maxLength={4}
                value={folio} 
                onChange={e => setFolio(e.target.value.replace(/\D/g, ''))}
                required 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {['inicial', 'caja', 'terminado'].map((phase) => (
              <div key={phase} className={`drag-drop-zone ${files[phase] ? 'active' : ''}`} style={{ position: 'relative', padding: '1rem' }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} 
                  onChange={e => handleFileChange(phase, e)}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                  {files[phase] ? <CheckCircle2 color="var(--success)" size={32} /> : <Upload size={32} color="var(--text-muted)" />}
                  <span style={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.75rem' }}>{phase}</span>
                </div>
              </div>
            ))}
          </div>

          <button 
            className="btn btn-primary" 
            disabled={!isFormValid || status === 'uploading' || !selectedSupervisor}
            style={{ marginTop: '0.5rem', width: '100%', gap: '0.5rem', fontSize: '1.25rem', height: '4rem' }}
          >
            {status === 'uploading' ? (
              <><Loader2 className="animate-spin" /> {compressionStatus || 'Procesando...'}</>
            ) : (
              'Guardar y Siguiente'
            )}
          </button>

          <AnimatePresence>
            {status === 'success' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
              >
                <CheckCircle2 size={18} /> Evidencia registrada con éxito.
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={18} /> {errorMsg.replace('AUTH_REQUIRED: ', '')}
                </div>
                {errorMsg.includes('AUTH_REQUIRED') && (
                  <a href="/api/auth/login" target="_blank" className="btn" style={{ background: 'var(--primary)', color: 'white', textDecoration: 'none', fontSize: '0.875rem', textAlign: 'center' }}>
                    Autorizar Acceso de Google
                  </a>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>

      <aside>
        <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
            <History size={18} color="var(--primary-glow)" />
            <h2 style={{ fontSize: '1rem' }}>Avance Global (Sync)</h2>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {history.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', marginTop: '2rem' }}>Ninguna carga aún</p>
            ) : (
              history.map(item => (
                <div key={item.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                  <div style={{ padding: '4px', background: 'rgba(37, 99, 235, 0.2)', borderRadius: '4px' }}>
                    <CheckCircle2 size={14} color="var(--primary-glow)" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{item.folio}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.supervisor}</span>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>{item.timestamp}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
    </main>
  );
}
