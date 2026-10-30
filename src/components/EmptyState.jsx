import { SearchIcon, WrenchIcon, ShieldIcon } from './Icons'

export default function EmptyState() {
  return (
    <section className="card empty">
      <div className="flatline" aria-hidden="true">
        <svg viewBox="0 0 400 48" preserveAspectRatio="none">
          <path d="M0 24H400" />
        </svg>
      </div>
      <h2>Paste an error to get started</h2>
      <p className="empty__lead">
        You will get the likely causes, ranked by how well they fit the evidence, plus the exact steps to confirm and fix each one.
      </p>
      <ul className="empty__list">
        <li><span><SearchIcon /></span><div><strong>What happened</strong><p>A plain-language explanation of the failure.</p></div></li>
        <li><span><WrenchIcon /></span><div><strong>How to fix it</strong><p>Ordered steps with commands you can copy.</p></div></li>
        <li><span><ShieldIcon /></span><div><strong>How to prevent it</strong><p>Changes that keep it from happening again.</p></div></li>
      </ul>
    </section>
  )
}
