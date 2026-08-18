import { useCallback } from 'react';
import type { ServerSummary } from '@linuxpilot/server-contracts';
import { NoSpacesHero } from './no-spaces-hero';
import { ServerSpaceHowItWorks } from './server-space-how-it-works';
import { UnassignedServersPicker } from './unassigned-servers-picker';
import styles from '../../server-spaces-page.module.css';

type NoSpacesStateProps = {
  servers: ServerSummary[];
  canManage: boolean;
  onCreate: (serverIds: string[]) => void;
};

export function NoSpacesState({ servers, canManage, onCreate }: NoSpacesStateProps) {
  const scrollToUnassigned = useCallback(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('spaces-unassigned')?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    });
  }, []);

  return (
    <div className={styles.firstSpace} data-testid="spaces-no-spaces">
      <NoSpacesHero
        canManage={canManage}
        onCreate={() => onCreate([])}
        onDistribute={scrollToUnassigned}
      />
      <div className={styles.lower}>
        <UnassignedServersPicker servers={servers} canManage={canManage} onCreate={onCreate} />
        <ServerSpaceHowItWorks />
      </div>
    </div>
  );
}
