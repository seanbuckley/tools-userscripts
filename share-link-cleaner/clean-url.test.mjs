// Expected-results table for cleanUrl().
//
// Run with:  node share-link-cleaner/clean-url.test.mjs
//
// Node has no `location` or `history`, so the script stops after exposing
// `window.__shareLinkCleaner` and never touches an address bar.
import fs from 'node:fs';

globalThis.window = globalThis;
const script = new URL('./share-link-cleaner.user.js', import.meta.url);
new Function(fs.readFileSync(script, 'utf8'))();
const { cleanUrl } = globalThis.__shareLinkCleaner;

// [input, expected]; `null` means leave the URL alone.
const CASES = [
  // Reddit
  ['https://www.reddit.com/r/Tailscale/comments/1wtygcj/using_the_same_hostnames_at_home_and_over/?share_id=NNO2d7e32tY1wsGdRyTzt',
    'https://www.reddit.com/r/Tailscale/comments/1wtygcj/using_the_same_hostnames_at_home_and_over/'],
  ['https://old.reddit.com/r/x/comments/abc/t/?share_id=Z&context=3',
    'https://old.reddit.com/r/x/comments/abc/t/?context=3'],
  ['https://www.reddit.com/r/x/comments/abc/t/?utm_source=share&utm_medium=ios_app&utm_name=ioscss&utm_content=1&utm_term=1',
    'https://www.reddit.com/r/x/comments/abc/t/'],
  ['https://www.reddit.com/r/x/comments/abc/t/?share_id=Z#comment-1',
    'https://www.reddit.com/r/x/comments/abc/t/#comment-1'],
  ['https://www.reddit.com/search/?q=tailscale%2Bheadscale&type=link', null],
  ['https://www.reddit.com/r/x/', null],
  // share_id elsewhere is not Reddit's, so it stays
  ['https://example.com/?share_id=abc', null],
  ['https://notreddit.com/?share_id=abc', null],

  // selfh.st / Ghost ref
  ['https://blog.cloudflare.com/cloudflare-certificate-authority/?ref=selfh.st',
    'https://blog.cloudflare.com/cloudflare-certificate-authority/'],
  ['https://github.com/foo/bar?tab=readme&ref=selfh.st',
    'https://github.com/foo/bar?tab=readme'],
  // ref with any other value is content (git refs, branch selectors)
  ['https://github.com/foo/bar/blob/x?ref=main', null],
  ['https://example.com/?ref=selfh.st.example', null],
  // utm_* off Reddit is left to uBO's lists
  ['https://example.com/?utm_source=share', null],

  // Encoding of surviving parameters is preserved byte for byte
  ['https://example.com/s?q=a%2Bb+c&ref=selfh.st', 'https://example.com/s?q=a%2Bb+c'],
  // Malformed escapes are kept rather than crashing
  ['https://example.com/?bad=%E0%A4%A&ref=selfh.st', 'https://example.com/?bad=%E0%A4%A'],
  ['not a url', null],
];

let failed = 0;
for (const [input, expected] of CASES) {
  const actual = cleanUrl(input);
  if (actual !== expected) {
    failed++;
    console.error(`FAIL ${input}\n  expected ${expected}\n  actual   ${actual}`);
  }
}
console.log(`${CASES.length - failed}/${CASES.length} passed`);
process.exit(failed ? 1 : 0);
