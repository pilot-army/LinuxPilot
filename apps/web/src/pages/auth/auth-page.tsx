import { LoginForm } from '../../features/auth/login-form';
import { useI18n } from '../../i18n';
import { BrandLogo } from '../../shared/ui/brand-logo';
import { InfrastructureOverview } from '../../widgets/auth/infrastructure-overview';
import styles from './auth-page.module.css';

export function AuthPage() {
  const { messages } = useI18n();

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <BrandLogo />
        </header>

        <main className={styles.main}>
          <section className={styles.brand} aria-label={messages.common.brand.name}>
            <InfrastructureOverview />
          </section>
          <section className={styles.panel}>
            <LoginForm />
          </section>
        </main>
      </div>
    </div>
  );
}
