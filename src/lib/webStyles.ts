import { Platform } from 'react-native';

// Browsers draw a focus ring (in the OS accent colour) around focused text fields. In
// Chrome it uses `outline-style: auto`, which ignores outline-width, so it can't be
// switched off per style prop. The caret is enough; remove the ring for all fields.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = 'input:focus, textarea:focus { outline: none; }';
  document.head.appendChild(style);
}
