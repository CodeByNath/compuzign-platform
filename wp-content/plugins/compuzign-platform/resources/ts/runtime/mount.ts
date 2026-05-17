// Mounting layer — renders a Preact component into a resolved DOM element.
// Handles both pre-DOM-ready and post-DOM-ready script execution safely,
// since WordPress can enqueue scripts in <head> or the footer.

import { render, h } from 'preact';
import type { ComponentType } from 'preact';

function doMount(component: ComponentType, element: HTMLElement): void {
  render(h(component as ComponentType<object>, {}), element);
}

// Mounts immediately if the DOM is ready; defers to DOMContentLoaded otherwise.
export function mountOnReady(component: ComponentType, element: HTMLElement): void {
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => doMount(component, element),
      { once: true },
    );
  } else {
    doMount(component, element);
  }
}
