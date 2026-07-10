#!/usr/bin/env node
// Bundles each edge function with the _shared modules into ONE .ts file so
// they can be pasted into the Supabase Dashboard editor (which cannot import
// files outside the function directory).
const fs = require('fs');
const path = require('path');

const FN_DIR = '/home/user/TuniTransport-App-Complete/TuniTransport/supabase/functions';
const OUT_DIR = path.join(FN_DIR, '..', 'functions-dashboard');

// Dependency order matters: no forward references at module-init time.
const SHARED_ORDER = ['errors.ts', 'env.ts', 'http.ts', 'split.ts', 'stripe.ts', 'webhook.ts', 'db.ts'];
const FUNCTIONS = ['create-payment-intent', 'create-checkout-session', 'stripe-webhook'];

const EXTERNAL_IMPORT = "import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';";

function stripInternalImports(src) {
  // Remove single- and multi-line import statements that reference ./ or ../
  return src.replace(/^import[\s\S]*?from\s+'\.\.?\/[^']*';\s*$/gm, '').replace(/\n{3,}/g, '\n\n');
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const sharedCode = SHARED_ORDER.map((f) => {
  const src = fs.readFileSync(path.join(FN_DIR, '_shared', f), 'utf8');
  return `// ═══ inlined from _shared/${f} ═══\n` + stripInternalImports(src).replace(EXTERNAL_IMPORT, '');
}).join('\n');

for (const fn of FUNCTIONS) {
  const entry = fs.readFileSync(path.join(FN_DIR, fn, 'index.ts'), 'utf8');
  const bundled = [
    '// ──────────────────────────────────────────────────────────────────────────',
    `// TuniTransport — ${fn} (single-file bundle for Supabase Dashboard deploys)`,
    '// GENERATED from supabase/functions/ — do not edit by hand; the sources in',
    '// supabase/functions/ (with _shared/) remain the canonical version.',
    '// ──────────────────────────────────────────────────────────────────────────',
    EXTERNAL_IMPORT,
    '',
    sharedCode,
    `// ═══ function entrypoint (${fn}/index.ts) ═══`,
    stripInternalImports(entry),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, `${fn}.ts`), bundled);
  console.log(`wrote functions-dashboard/${fn}.ts (${bundled.length} chars)`);
}
