import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import styles from './not-found-page.module.css';

export function NotFoundPage() {
  const { messages } = useI18n();

  return (
    <main className={styles.page} data-testid="not-found-page">
      <p className={styles.code}>404</p>
      <h1>{messages.auth.notFound.title}</h1>
      <p>{messages.auth.notFound.body}</p>
      <Link to="/dashboard">{messages.auth.notFound.home}</Link>
    </main>
  );
}
