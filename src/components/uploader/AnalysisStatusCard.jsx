// AnalysisStatusCard.jsx — progress ring + step dots shown during Gemini analysis
export default function AnalysisStatusCard({ streamOutput, analyzing, uploadInfo, uploadPct }) {
  const s = streamOutput || '';
  let stepIndex = 0;
  if (s.includes('Uploading video'))                             stepIndex = 0;
  else if (s.includes('Scanning') || s.includes('Optimis'))     stepIndex = 1;
  else if (s.includes('Running analysis') || s.includes('{'))   stepIndex = 2;

  const hasUpload  = s.includes('Uploading video');
  const isRetrying = s.includes('retrying');
  const isDone     = !analyzing && s.length > 5;

  const allSteps = [
    { key: 'upload',  label: 'Uploading footage', icon: '↑' },
    { key: 'scan',    label: 'Reading footage',    icon: '◉' },
    { key: 'analyse', label: 'Analysing player',   icon: '✦' },
    { key: 'done',    label: 'Complete',           icon: '✓' },
  ];
  const steps     = hasUpload ? allSteps : allSteps.slice(1);
  const activeIdx = hasUpload ? stepIndex : Math.max(0, stepIndex - 1);

  const displayLabel = isDone      ? 'Complete'
    : isRetrying                   ? 'High demand, retrying...'
    : (steps[activeIdx]?.label ?? 'Analysing player');
  const displayIcon  = isDone ? '✓' : steps[activeIdx]?.icon ?? '✦';

  return (
    <div style={{
      marginTop: 16, background: '#131920', border: '1px solid #1e2735',
      borderRadius: 12, padding: '28px 24px', textAlign: 'center',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <div style={{ position: 'relative', width: 64, height: 64 }}>
          <svg width="64" height="64" style={{ position: 'absolute', top: 0, left: 0, animation: analyzing ? 'spinSlow 1.4s linear infinite' : 'none' }}>
            <circle cx="32" cy="32" r="28" fill="none" stroke="#1e2735" strokeWidth="3" />
            <circle cx="32" cy="32" r="28" fill="none" stroke="#3ecf70" strokeWidth="3"
              strokeDasharray={analyzing ? '44 132' : '176 0'} strokeDashoffset="44" strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.6s ease' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
            {displayIcon}
          </div>
        </div>
      </div>

      <div className="font-syne" style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f0f1f3', marginBottom: 6 }}>
        {displayLabel}
      </div>

      {uploadInfo && (
        <div style={{ margin: '12px auto 0', maxWidth: 240 }}>
          <div style={{ height: 3, background: '#2a2d38', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: '#3ecf70', borderRadius: 99,
              width: `${uploadPct * 100}%`, transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ fontSize: '0.70rem', color: '#50535f', marginTop: 5 }}>
            {uploadPct < 0.93
              ? `${Math.round(uploadPct * 100)}% (~${Math.round(Math.max(0, (uploadInfo.totalMB / 0.6) - (Date.now() - uploadInfo.startMs) / 1000))}s left)`
              : 'Finalising...'}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            width: i === activeIdx ? 20 : 6, height: 6, borderRadius: 99,
            background: i <= activeIdx ? '#3ecf70' : '#2a2d38',
            transition: 'all 0.4s ease', opacity: i > activeIdx ? 0.4 : 1,
          }} />
        ))}
      </div>
    </div>
  );
}
