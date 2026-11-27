// Thin-line icons (designstructure.md §3.11): 24x24, stroke 1.5, rounded caps; color comes from CSS currentColor.
const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICON = {
  sprout: svg('<path d="M12 21V10"/><path d="M12 13c-4 0-6-3-6-7 4 0 6 3 6 7z"/><path d="M12 11c0-4 2-7 6-7 0 4-2 7-6 7z"/><path d="M8 21h8"/>'),
  book: svg('<path d="M3 5.5c3-1.3 6-1.3 9 .5v13c-3-1.8-6-1.8-9-.5z"/><path d="M21 5.5c-3-1.3-6-1.3-9 .5v13c3-1.8 6-1.8 9-.5z"/>'),
  island: svg('<path d="M3 11l9-5 9 5-9 5z"/><path d="M3 11v2.5l9 5 9-5V11"/><path d="M8 11.2c1.5-1 3-.6 4 .3s2.6 1 4-.1"/>'),
  star: svg('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>'),
  flag: svg('<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>'),
  mountains: svg('<path d="M2 19l7-12 4 6.5"/><path d="M9.5 19l5.5-9 7 9z"/><path d="M7 11l2 1.5 1.5-1"/>'),
};
