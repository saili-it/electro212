// Next.js's bundler replaces the real "server-only" package with a no-op for
// server-compiled code; Vitest doesn't do that substitution, so we alias it
// here (see vitest.config.ts) to avoid the package's unconditional throw.
export {};
