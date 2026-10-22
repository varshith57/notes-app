import { Platform } from 'react-native';

// Web-only page styles (phones are unaffected):
// - Browsers draw a focus ring (in the OS accent colour) around focused text fields. In
//   Chrome it uses `outline-style: auto`, which ignores outline-width, so it can't be
//   switched off per style prop. The caret is enough; remove the ring for all fields.
// - A two-finger sideways trackpad swipe makes the browser slide the page aside to preview
//   the previous history entry, which can stall half-way and look like two app screens
//   overlapping. The app has its own back navigation, so turn that browser gesture off.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = [
    'input:focus, textarea:focus { outline: none; }',
    'html, body { overscroll-behavior-x: none; }',
  ].join('\n');
  document.head.appendChild(style);
}
