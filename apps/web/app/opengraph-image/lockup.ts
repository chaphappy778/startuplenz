// apps/web/app/opengraph-image/lockup.ts
//
// DEPRECATED, unused. Previously held the inlined brand lockup PNG as
// a base64 data URI so the /opengraph-image edge route could render
// the logo without an HTTP fetch. Satori (the renderer inside next/og)
// turned out to have flaky data-URI support for our PNG in 16.x even
// after re-encoding the source cleanly, so the route now loads the
// lockup over HTTPS from /brand/ instead. Safe to delete this file.

export const LOCKUP_INDIGO_PNG_B64 = "";
