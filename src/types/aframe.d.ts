/**
 * Declaração global para tags JSX do A-Frame.
 * Isso permite que o TypeScript aceite tags como <a-scene>, <a-entity>, etc.
 */
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
