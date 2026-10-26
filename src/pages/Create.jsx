import { useState } from 'react';
import { useWallet } from '../context/WalletContext.jsx';
import { MintButton } from '../components/MintButton.jsx';
import { explorerTx } from '../web3/config.js';

const STEPS = ['Upload', 'Metadata', 'Mint', 'Complete'];
const MAX_BYTES = 25 * 1024 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'model/gltf-binary'];

export default function Create() {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [metadataUri, setMetadataUri] = useState('');
  const [minted, setMinted] = useState(null);
  const [meta, setMeta] = useState({ name: '', description: '', category: 'Art', royalty: 5, traits: '' });
  const { account, setModalOpen } = useWallet();

  const pick = (f) => {
    setError('');
    if (!f) return;
    if (!TYPES.includes(f.type)) return setError('Unsupported file type. Use PNG, JPG, WEBP, GIF, MP4 or GLB.');
    if (f.size > MAX_BYTES) return setError('File is larger than 25 MB.');
    setFile(f);
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : '');
  };

  const metaValid = meta.name.trim().length > 0 && meta.name.length <= 60 && meta.royalty >= 0 && meta.royalty <= 10;
  const traitsParsed = meta.traits.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [k, ...v] = l.split(':');
    return { trait_type: (k || '').trim(), value: v.join(':').trim() };
  });
  const draftJson = {
    name: meta.name,
    description: meta.description,
    category: meta.category,
    royalty_percent: Number(meta.royalty),
    attributes: traitsParsed,
    image: file ? `(pending upload: ${file.name})` : '(no file)',
  };

  return (
    <main className="section narrow">
      <div className="section-head"><h1>Create</h1><span className="muted small">Testnet only</span></div>
      <ol className="steps" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? 'current' : i < step ? 'done' : ''} aria-current={i === step}>
            <span>{i + 1}</span> {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="glass panel">
          <label className="dropzone">
            <input type="file" accept={TYPES.join(',')} onChange={(e) => pick(e.target.files[0])} />
            <strong>{file ? file.name : 'Choose a file'}</strong>
            <span className="muted small">PNG, JPG, WEBP, GIF, MP4 or GLB · up to 25 MB</span>
          </label>
          {error && <p className="error small" role="alert">{error}</p>}
          {preview && <img className="upload-preview" src={preview} alt="Upload preview" />}
          <div className="row end">
            <button className="btn btn-primary" disabled={!file} onClick={() => setStep(1)}>Next</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="glass panel">
          <label className="field"><span>Name *</span>
            <input value={meta.name} maxLength={60} onChange={(e) => setMeta({ ...meta, name: e.target.value })} />
          </label>
          <label className="field"><span>Description</span>
            <textarea rows={3} maxLength={500} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
          </label>
          <label className="field"><span>Category</span>
            <select value={meta.category} onChange={(e) => setMeta({ ...meta, category: e.target.value })}>
              {['Art', 'Gaming', 'PFPs', 'Music', '3D'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="field"><span>Royalty: {meta.royalty}% (max 10)</span>
            <input type="range" min="0" max="10" step="0.5" value={meta.royalty} onChange={(e) => setMeta({ ...meta, royalty: e.target.value })} />
          </label>
          <label className="field"><span>Traits (one per line, "Type: Value")</span>
            <textarea rows={3} value={meta.traits} placeholder={'Background: Void\nRarity: Rare'} onChange={(e) => setMeta({ ...meta, traits: e.target.value })} />
          </label>
          <p className="muted tiny">Draft metadata (not uploaded anywhere yet):</p>
          <pre className="json">{JSON.stringify(draftJson, null, 2)}</pre>
          <div className="row between">
            <button className="btn btn-ghost" onClick={() => setStep(0)}>Back</button>
            <button className="btn btn-primary" disabled={!metaValid} onClick={() => setStep(2)}>Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="glass panel">
          <h3>Mint on Sepolia</h3>
          <p className="muted small">
            Orbix does not upload files or pin metadata yet. Host your metadata JSON yourself (ipfs:// or https://) and paste its URI below.
            The JSON draft for the metadata is shown on the previous step.
          </p>
          <label className="field"><span>Metadata URI *</span>
            <input value={metadataUri} placeholder="ipfs://… or https://…" onChange={(e) => setMetadataUri(e.target.value.trim())} />
          </label>
          <p className="small">Wallet: {account ? <code>{account}</code> : 'not connected'}</p>
          <div className="row between">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
            <MintButton
              royaltyPercent={meta.royalty}
              metadataUri={metadataUri}
              disabledReason="Enter a metadata URI (ipfs:// or https://) to mint."
              onSuccess={(receipt) => { setMinted(receipt); setStep(3); }}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="glass panel">
          <h3>Minted on Sepolia</h3>
          <p className="muted small">Confirmed on chain. Testnet only.</p>
          {minted && <p className="small">Transaction: <a href={explorerTx(minted.transactionHash)} target="_blank" rel="noopener noreferrer">{minted.transactionHash.slice(0, 12)}…</a></p>}
          <button className="btn btn-primary" onClick={() => { setStep(0); setFile(null); setPreview(''); setMetadataUri(''); setMinted(null); }}>Create another</button>
        </div>
      )}
    </main>
  );
}
