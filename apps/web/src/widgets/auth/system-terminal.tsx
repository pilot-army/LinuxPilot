import styles from './system-terminal.module.css';

type TerminalServiceStatus = 'active' | 'protected';

type TerminalService = {
  name: string;
  status: TerminalServiceStatus;
};

const services: TerminalService[] = [
  { name: 'nginx', status: 'active' },
  { name: 'docker', status: 'active' },
  { name: 'firewall', status: 'protected' },
];

const NAME_COLUMN_WIDTH = 12;

export function SystemTerminal() {
  return (
    <div className={styles.terminal} aria-hidden="true">
      <div className={styles.titlebar}>
        <span className={styles.controls}>
          <span className={styles.control} />
          <span className={styles.control} />
          <span className={styles.control} />
        </span>
        <span className={styles.session}>linuxpilot@server: ~</span>
      </div>
      <pre className={styles.body}>
        <div className={styles.command}>$ linuxpilot status</div>
        {services.map((service) => (
          <div key={service.name} className={styles.row}>
            <span className={styles.bullet}>●</span>
            <span className={styles.name}>{service.name.padEnd(NAME_COLUMN_WIDTH)}</span>
            <span className={styles[service.status]}>{service.status}</span>
          </div>
        ))}
        <span className={styles.cursor} />
      </pre>
    </div>
  );
}
