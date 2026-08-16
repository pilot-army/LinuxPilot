import { useAuth } from '../../auth/AuthProvider';
import { AuthError } from '../../features/auth/auth-error';
import { useI18n } from '../../i18n';
import { Button } from '../../shared/ui/button';
import { LanguageSwitcher } from '../../shared/ui/language-switcher';
import { Logo } from '../../shared/ui/logo';
import styles from './dashboard-page.module.css';

export function DashboardPage() {
  const { user, logout, error } = useAuth();
  const { messages } = useI18n();

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Logo compact />
        <div className={styles.user}>
          <LanguageSwitcher />
          <div className={styles.identity}>
            <p>{user?.username}</p>
            <small>{user?.roles.join(', ')}</small>
          </div>
          <Button variant="ghost" data-testid="sign-out" onClick={() => void logout()}>
            {messages.auth.actions.signOut}
          </Button>
        </div>
      </header>
      <main className={styles.main}>
        {error ? <AuthError message={messages.auth.errors[error]} /> : null}
        <section className={styles.placeholder}>
          <p className={styles.eyebrow}>{messages.auth.dashboard.eyebrow}</p>
          <h1>{messages.auth.dashboard.title}</h1>
          <p>{messages.auth.dashboard.body}</p>
        </section>
      </main>
    </div>
  );
}
