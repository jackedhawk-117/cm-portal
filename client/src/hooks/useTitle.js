import { useEffect } from 'react';

/** Set the document title for the current page. */
export function useTitle(title) {
  useEffect(() => {
    document.title = title
      ? `${title} · CM Kerala Grievance Portal`
      : 'CM Kerala – Public Grievance Redressal Portal';
  }, [title]);
}
