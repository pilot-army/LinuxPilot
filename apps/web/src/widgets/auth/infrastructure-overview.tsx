import { useEffect, useState } from 'react';
import { useGatewayHealth } from '../../features/auth/use-gateway-health';
import { useI18n } from '../../i18n';
import { SystemStatus } from './system-status';
import { SystemTerminal } from './system-terminal';
import styles from './infrastructure-overview.module.css';

function useDesktopArt() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }

    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => setEnabled(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return enabled;
}

export function InfrastructureOverview() {
  const { messages } = useI18n();
  const showArt = useDesktopArt();
  const { status, health } = useGatewayHealth();

  return (
    <div className={styles.overview}>
      {showArt ? (
        <div className={styles.art} aria-hidden="true">
          <div className={styles.wash} />
          <div className={styles.glow} />
          <svg
            className={styles.network}
            viewBox="0 0 720 900"
            preserveAspectRatio="xMidYMid slice"
          >
            <path d="M-20 160 C120 110, 240 230, 380 170 S620 70, 780 150" />
            <path d="M-40 340 C140 280, 280 420, 430 340 S680 230, 820 330" />
            <path d="M-10 540 C160 470, 300 630, 470 540 S720 430, 860 530" />
            <path d="M40 80 C200 40, 320 140, 480 80 S700 20, 820 90" />
            <circle cx="168" cy="214" r="3.2" />
            <circle cx="312" cy="368" r="2.6" />
            <circle cx="454" cy="188" r="3" />
            <circle cx="246" cy="512" r="2.4" />
          </svg>
          <svg className={styles.racks} viewBox="0 0 420 360" preserveAspectRatio="xMidYMid meet">
            <g fill="none" stroke="rgba(168, 196, 232, 0.46)" strokeWidth="1.55">
              <rect x="18" y="28" width="92" height="292" rx="10" />
              <rect x="128" y="48" width="92" height="272" rx="10" />
              <rect x="238" y="18" width="92" height="302" rx="10" />
              <rect x="348" y="64" width="54" height="256" rx="10" />
            </g>
            <g fill="rgba(24, 38, 68, 0.82)">
              <rect x="28" y="46" width="72" height="16" rx="3" />
              <rect x="28" y="72" width="72" height="16" rx="3" />
              <rect x="28" y="98" width="72" height="16" rx="3" />
              <rect x="28" y="124" width="72" height="16" rx="3" />
              <rect x="138" y="66" width="72" height="16" rx="3" />
              <rect x="138" y="92" width="72" height="16" rx="3" />
              <rect x="138" y="118" width="72" height="16" rx="3" />
              <rect x="248" y="36" width="72" height="16" rx="3" />
              <rect x="248" y="62" width="72" height="16" rx="3" />
              <rect x="248" y="88" width="72" height="16" rx="3" />
              <rect x="248" y="114" width="72" height="16" rx="3" />
              <rect x="358" y="82" width="34" height="14" rx="3" />
              <rect x="358" y="106" width="34" height="14" rx="3" />
            </g>
            <g>
              <circle cx="86" cy="54" r="2.5" fill="#5ee7ff" />
              <circle cx="86" cy="80" r="2.5" fill="#4ade80" />
              <circle cx="86" cy="106" r="2.5" fill="#5ee7ff" />
              <circle cx="196" cy="74" r="2.5" fill="#7aa2ff" />
              <circle cx="196" cy="100" r="2.5" fill="#4ade80" />
              <circle cx="306" cy="44" r="2.5" fill="#5ee7ff" />
              <circle cx="306" cy="70" r="2.5" fill="#4ade80" />
              <circle cx="306" cy="96" r="2.5" fill="#7aa2ff" />
              <circle cx="378" cy="89" r="2.3" fill="#5ee7ff" />
              <circle cx="378" cy="113" r="2.3" fill="#4ade80" />
            </g>
          </svg>
        </div>
      ) : null}

      <section className={styles.copy} aria-labelledby="auth-hero-title">
        <h1 id="auth-hero-title">{messages.auth.hero.title}</h1>
        <p className={styles.description}>{messages.auth.hero.description}</p>
        <div className={styles.statusStack}>
          <SystemStatus status={status} healthStatus={health?.status} />
          <SystemTerminal status={status} health={health} />
        </div>
      </section>
    </div>
  );
}
