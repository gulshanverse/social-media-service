export default function SendPage() {
  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: '5rem 1.5rem' }}>
      <p style={{ color: '#C8FF00', fontWeight: 800 }}>SEND ANONYMOUSLY</p>
      <h1>What’s on your mind?</h1>
      <p style={{ color: '#9CA3AF' }}>
        Phase 1 foundation is ready. The submission flow is planned for Phase 2.
      </p>
      <textarea
        aria-label="Confession text"
        disabled
        placeholder="Your anonymous confession will live here…"
        style={{
          width: '100%',
          minHeight: 220,
          padding: 16,
          borderRadius: 18,
          background: '#151C2B',
          color: '#fff',
          border: '1px solid #28334a',
        }}
      />
      <p style={{ color: '#9CA3AF' }}>
        Submission is intentionally disabled until the public experience phase.
      </p>
    </main>
  );
}
