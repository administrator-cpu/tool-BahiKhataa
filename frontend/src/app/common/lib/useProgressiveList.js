import { useState } from 'react';

// Renders a long in-memory list in chunks as the user scrolls (search, totals and sorting
// still use the full list). Resets to the first chunk whenever the list itself changes.
export function useProgressiveList(list, chunk = 60) {
  const [win, setWin] = useState({ source: null, count: chunk });
  const count = win.source === list ? win.count : chunk;
  return {
    visible: list.length > count ? list.slice(0, count) : list,
    hasMore: list.length > count,
    showMore: () => setWin({ source: list, count: count + chunk }),
  };
}
