import { interpolate } from '../../../features/servers/format';
import { useI18n } from '../../../i18n';
import { Button } from '../../../shared/ui/button';
import styles from '../server-section.module.css';

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  shown: number;
  pageSizes?: number[];
  testId?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
};

export function Pagination({
  page,
  pageSize,
  total,
  shown,
  pageSizes = [25, 50, 100],
  testId,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const { messages } = useI18n();
  const copy = messages.servers.list;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 || shown === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = total === 0 ? 0 : (page - 1) * pageSize + shown;

  return (
    <div className={styles.pagination} data-testid={testId}>
      <p>
        {shown === 0
          ? interpolate(copy.shownZero, { total })
          : interpolate(copy.shown, { from, to, total })}
      </p>
      {onPageSizeChange ? (
        <label>
          {copy.pagination.pageSize}
          <select
            className={styles.filterSelect}
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className={styles.pageNav}>
        <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          {copy.pagination.previous}
        </Button>
        <span>{interpolate(copy.pagination.page, { page })}</span>
        <Button
          variant="ghost"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          {copy.pagination.next}
        </Button>
      </div>
    </div>
  );
}
