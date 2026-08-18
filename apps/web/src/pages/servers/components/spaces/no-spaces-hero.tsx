import type { ReactNode } from 'react';
import { INSTALL_GUIDE_URL } from '../../../../features/enrollment/command';
import {
  ChartIcon,
  ExternalIcon,
  FilterIcon,
  PlusIcon,
  UsersIcon,
} from '../../../../features/dashboard/icons';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui/button';
import { FirstSpaceIllustration } from './first-space-illustration';
import styles from '../../server-spaces-page.module.css';

type NoSpacesHeroProps = {
  canManage: boolean;
  onCreate: () => void;
  onDistribute: () => void;
};

export function NoSpacesHero({ canManage, onCreate, onDistribute }: NoSpacesHeroProps) {
  const { messages } = useI18n();
  const copy = messages.servers.groups;
  const benefits: { title: string; body: string; icon: ReactNode }[] = [
    { title: copy.benefitOpsTitle, body: copy.benefitOpsBody, icon: <UsersIcon /> },
    { title: copy.benefitMetricsTitle, body: copy.benefitMetricsBody, icon: <ChartIcon /> },
    { title: copy.benefitRulesTitle, body: copy.benefitRulesBody, icon: <FilterIcon /> },
  ];

  return (
    <section className={styles.firstHero} aria-labelledby="spaces-first-title">
      <FirstSpaceIllustration
        label={copy.firstSpaceIllustration}
        spaceLabel={copy.illustrationNewSpace}
      />
      <div className={styles.firstCopy}>
        <h2 id="spaces-first-title">{copy.emptyNoSpacesTitle}</h2>
        <p>{copy.emptyNoSpacesBody}</p>
        {canManage ? (
          <div className={styles.firstActions}>
            <Button onClick={onCreate} data-testid="spaces-create-first">
              <PlusIcon />
              {copy.create}
            </Button>
            <Button variant="secondary" onClick={onDistribute} data-testid="spaces-distribute">
              {copy.distribute}
            </Button>
          </div>
        ) : (
          <p className={styles.permissionHint} data-testid="spaces-create-hint">
            {copy.createPermissionHint}
          </p>
        )}
        <a
          className={styles.docs}
          href={INSTALL_GUIDE_URL}
          target="_blank"
          rel="noreferrer"
          data-testid="spaces-docs"
        >
          {copy.docsLink}
          <ExternalIcon />
        </a>
        <ul className={styles.benefits}>
          {benefits.map((item) => (
            <li key={item.title}>
              <span className={styles.benefitIcon} aria-hidden="true">
                {item.icon}
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.body}</small>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
