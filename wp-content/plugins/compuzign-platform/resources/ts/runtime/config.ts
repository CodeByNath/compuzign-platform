// Runtime configuration injected by WordPress via AssetLoader.php → wp_localize_script.
// Currently carries API access; extended here with future runtime context
// (page type, user flags, feature gates) as the platform grows.

export interface RuntimeConfig {
  apiRoot: string;
  nonce: string;
  contactUrl?: string;
  costBuilderUrl?: string;
}

// window.CompuZignConfig is globally declared in api/client.ts.
// We read it here to centralise runtime config access for the mounting layer
// without duplicating the global augmentation.
export function getRuntimeConfig(): RuntimeConfig | null {
  return window.CompuZignConfig ?? null;
}

export function assertRuntimeConfig(): RuntimeConfig {
  const config = getRuntimeConfig();
  if (!config) {
    throw new Error(
      '[CompuZign] CompuZignConfig is not defined. ' +
        'Ensure AssetLoader.php calls wp_localize_script for the enqueued script.',
    );
  }
  return config;
}
