import { ChevronIcon } from '../../../features/dashboard/icons';
import { interpolate } from '../../../features/servers/format';
import { PAGE_SIZES, type PageSize } from '../../../features/servers/types';
import { useI18n } from '../../../i18n';
import styles from '../servers-page.module.css';

type ServerPaginationProps = {
  page: number;
  pageSize: PageSize;
  total: number;
  shown: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
};

function pageWindow(page: number, pages: number): number[] {
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const from = Math.max(1, start);
  const to = Math.min(pages, from + 4);
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

export function ServerPagination({
  page,
  pageSize,
  total,
  shown,
  onPageChange,
  onPageSizeChange,
}: ServerPaginationProps) {
  const { messages } = useI18n();
  const copy = messages.servers.list;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 || shown === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = total === 0 ? 0 : (page - 1) * pageSize + shown;

  return (
    <div className={styles.pagination} data-testid="servers-pagination">
      <label className={styles.pageSize}>
        {copy.pagination.pageSize}
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value) as PageSize)}
        >
          {PAGE_SIZES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <p>
        {shown === 0
          ? interpolate(copy.shownZero, { total })
          : interpolate(copy.shown, { from, to, total })}
      </p>
      <div className={styles.pageNav}>
        <button
          type="button"
          className={styles.pageButton}
          disabled={page <= 1}
          aria-label={copy.pagination.first}
          onClick={() => onPageChange(1)}
        >
          «
        </button>
        <button
          type="button"
          className={styles.pageButton}
          disabled={page <= 1}
          aria-label={copy.pagination.previous}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronIcon className={styles.pagePrev} />
        </button>
        {pageWindow(page, pages).map((value) => (
          <button
            key={value}
            type="button"
            className={`${styles.pageButton} ${value === page ? styles.pageCurrent : ''}`}
            aria-label={interpolate(copy.pagination.page, { page: value })}
            aria-current={value === page ? 'page' : undefined}
            onClick={() => onPageChange(value)}
          >
            {value}
          </button>
        ))}
        <button
          type="button"
          className={styles.pageButton}
          disabled={page >= pages}
          aria-label={copy.pagination.next}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronIcon />
        </button>
        <button
          type="button"
          className={styles.pageButton}
          disabled={page >= pages}
          aria-label={copy.pagination.last}
          onClick={() => onPageChange(pages)}
        >
          »
        </button>
      </div>
    </div>
  );
}
