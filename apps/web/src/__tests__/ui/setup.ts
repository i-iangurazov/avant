const elementProto = Element.prototype as Element & {
  hasPointerCapture?: (pointerId: number) => boolean;
  setPointerCapture?: (pointerId: number) => void;
  releasePointerCapture?: (pointerId: number) => void;
};

if (!elementProto.hasPointerCapture) {
  elementProto.hasPointerCapture = () => false;
}

if (!elementProto.setPointerCapture) {
  elementProto.setPointerCapture = () => {};
}

if (!elementProto.releasePointerCapture) {
  elementProto.releasePointerCapture = () => {};
}

if (typeof window !== 'undefined') {
  const target = window as Window & { PointerEvent?: typeof MouseEvent };
  if (!target.PointerEvent) {
    target.PointerEvent = MouseEvent;
  }
}

if (!elementProto.scrollIntoView) {
  elementProto.scrollIntoView = () => {};
}

if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  (window as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver = ResizeObserver;
  (globalThis as typeof globalThis & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver = ResizeObserver;
}

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  (window as Window & { matchMedia?: (query: string) => MediaQueryList }).matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}
