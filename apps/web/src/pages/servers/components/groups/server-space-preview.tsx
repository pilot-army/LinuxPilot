import {
  GROUP_COLOR_TOKENS,
  type GroupColorToken,
  type ServerSpaceIcon,
} from '@linuxpilot/server-contracts';
import { CheckIcon, ServersIcon } from '../../../../features/dashboard/icons';
import { interpolate } from '../../../../features/servers/format';
import { SpaceIcon } from '../../../../features/groups/space-icons';
import styles from './create-space-dialog.module.css';

type ServerSpacePreviewProps = {
  name: string;
  description: string;
  tags: string[];
  icon: ServerSpaceIcon;
  color: GroupColorToken;
  title: string;
  namePlaceholder: string;
  descriptionPlaceholder: string;
  serversLabel: string;
  benefitsTitle: string;
  benefits: string[];
};

export function ServerSpacePreview({
  name,
  description,
  tags,
  icon,
  color,
  title,
  namePlaceholder,
  descriptionPlaceholder,
  serversLabel,
  benefitsTitle,
  benefits,
}: ServerSpacePreviewProps) {
  return (
    <aside className={styles.aside}>
      <h3 className={styles.previewTitle}>{title}</h3>
      <article
        className={styles.previewCard}
        style={{ ['--group-color' as string]: GROUP_COLOR_TOKENS[color] }}
        data-testid="space-preview"
      >
        <div className={styles.previewHead}>
          <span className={styles.previewIcon} aria-hidden="true">
            <SpaceIcon icon={icon} />
          </span>
          <div className={styles.previewCopy}>
            <strong>{name.trim() || namePlaceholder}</strong>
            <p>{description.trim() || descriptionPlaceholder}</p>
          </div>
        </div>
        {tags.length > 0 ? (
          <div className={styles.previewTags}>
            {tags.map((tag) => (
              <span key={tag} className={styles.previewTag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <div className={styles.previewMeta}>
          <ServersIcon width={14} height={14} />
          <span>{interpolate(serversLabel, { count: 0 })}</span>
        </div>
      </article>
      <h3 className={styles.benefitsTitle}>{benefitsTitle}</h3>
      <ul className={styles.benefits}>
        {benefits.map((item) => (
          <li key={item}>
            <CheckIcon width={14} height={14} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
