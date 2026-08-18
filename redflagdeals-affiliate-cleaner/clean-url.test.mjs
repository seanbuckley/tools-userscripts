// Expected-results table for cleanUrl(), taken from ten saved RedFlagDeals
// pages (August 2026): eight thread pages, the Hot Deals listing and the
// www.redflagdeals.com front page.
//
// Run with:  node redflagdeals-affiliate-cleaner/clean-url.test.mjs
//
// The userscript is an IIFE meant for a browser, so this loads it with just
// enough DOM stubbed to reach the end of that IIFE, then uses the
// `window.__rfdAffiliateCleaner` handle it exposes.
import fs from 'node:fs';

const stubElement = () => ({
  id: '', textContent: '', dataset: {},
  matches: () => false, querySelector: () => null, querySelectorAll: () => [],
  closest: () => null, setAttribute: () => {}, getAttribute: () => null,
  appendChild: () => {},
});
globalThis.document = {
  body: stubElement(), head: stubElement(), documentElement: stubElement(),
  getElementById: () => null, createElement: stubElement,
};
globalThis.MutationObserver = class { observe() {} };
globalThis.window = globalThis;

const script = new URL('./redflagdeals-affiliate-cleaner.user.js', import.meta.url);
new Function(fs.readFileSync(script, 'utf8'))();
const { cleanUrl } = globalThis.__rfdAffiliateCleaner;

// `S` marks a link sitting inside deal or post content, where stripping tracking
// parameters off a bare merchant URL is allowed. Links elsewhere on the page get
// `false`: a known redirector is still unwrapped, but nothing else is touched.
const S = true;

// [href, allowStripOnly, expected]  — expected null means "leave it alone".
const cases = [
 // [href, allowStripOnly, expected (null = leave alone)]
 ['http://go.redirectingat.com/?id=130832X1694315&xs=1&url=https%3A%2F%2Fwww.yeti.ca%2Fcustomize', S, 'https://www.yeti.ca/customize'],
 ['http://go.redirectingat.com?id=130832X1694315&xs=1&url=https%3A%2F%2Fmeyercanada.ca%2Fproducts%2F24cm-fry-pan-open%3Fvariant%3D6017451753500', S, 'https://meyercanada.ca/products/24cm-fry-pan-open?variant=6017451753500'],
 ['http://go.redirectingat.com/?id=130832X1694315&xs=1&url=https%3A%2F%2Fwww.canadiantire.ca%2Fen%2Fpdp%2Fmastercraft-wrench-pliers-set-machined-grooves-double-shot-handle-carbon-steel-10-pc-0584791p.html%3Floc%3Ddf', S, 'https://www.canadiantire.ca/en/pdp/mastercraft-wrench-pliers-set-machined-grooves-double-shot-handle-carbon-steel-10-pc-0584791p.html?loc=df'],
 ['http://go.redirectingat.com/?id=130832X1694315&xs=1&url=https%3A%2F%2Fwww.theshoecompany.ca%2Fproduct%2Fadidas-mens-adilette-shower-slide-sandal%2F275501432%3FactiveColor%3D521', S, 'https://www.theshoecompany.ca/product/adidas-mens-adilette-shower-slide-sandal/275501432?activeColor=521'],
 // Impact, raw u= with its own query string running on into the wrapper's
 ['https://bestbuyca.o93x.net/c/341376/644465/10221?u=https://www.bestbuy.ca/en-ca/product/breville-barista-express-impress-espresso-machine-bes876bss1bna1-brushed-stainless-steel/16374006?source=collection&adSlot=2&slotPos=2&pageKey=collection&subId1=f2823256', S, 'https://www.bestbuy.ca/en-ca/product/breville-barista-express-impress-espresso-machine-bes876bss1bna1-brushed-stainless-steel/16374006?source=collection&adSlot=2&slotPos=2&pageKey=collection'],
 // Impact, raw u= where the destination has NO query string, so &subId1 hangs off the path
 ['https://bestbuyca.o93x.net/c/341376/644465/10221?u=https://www.bestbuy.ca/en-ca/product/delonghi-magnifica-evo-automatic-espresso-maker-with-frother-grinder-over-ice-function-silver-black/16250764&subId1=f2823256', S, 'https://www.bestbuy.ca/en-ca/product/delonghi-magnifica-evo-automatic-espresso-maker-with-frother-grinder-over-ice-function-silver-black/16250764'],
 // Impact, percent-encoded u=
 ['http://lenovo.evyy.net/c/341376/225728/3899?u=https%3A%2F%2Fwww.lenovo.com%2Fca%2Fen%2Fp%2Faccessories-and-software%2Fkeyboards-and-mice%2Fmice%2Fgy51c21211', S, 'https://www.lenovo.com/ca/en/p/accessories-and-software/keyboards-and-mice/mice/gy51c21211'],
 // LinkSynergy
 ['http://click.linksynergy.com/deeplink?id=CAqD7bLWUPI&mid=36751&murl=https%3A%2F%2Fwww.walmart.ca%2Fip%2F6000208859099&u1=rfdcb', S, 'https://www.walmart.ca/ip/6000208859099'],
 ['http://click.linksynergy.com/deeplink?id=CAqD7bLWUPI&mid=36751&murl=https%3A%2F%2Fwww.walmart.ca%2Fen&u1=rfdcb', S, 'https://www.walmart.ca/en'],
 ['http://click.linksynergy.com/deeplink?id=CAqD7bLWUPI&mid=13923&murl=https%3A%2F%2Fwww.lego.com%2Fen-ca%2Fcategories%2Fsales-and-deals%3Foffset%3D0%26locale%3Den-ca%26slug.i0%3Dsales-and-deals&u1=rfdcb', S, 'https://www.lego.com/en-ca/categories/sales-and-deals?offset=0&locale=en-ca&slug.i0=sales-and-deals'],
 ['http://click.linksynergy.com/deeplink?id=CAqD7bLWUPI&mid=45854&murl=https%3A%2F%2Fwww.zwilling.com%2Fca%2Fsale%2Fsummer-clearance%2F%3Fstart%3D32%26sz%3D32&u1=rfdcb', S, 'https://www.zwilling.com/ca/sale/summer-clearance/?start=32&sz=32'],
 // AvantLink
 ['https://www.avantlink.com/click.php?tt=ml&ti=863485&pw=144787&url=https%3A%2F%2Fwww.mec.ca%2Fen%2Fproducts%2Fdeals', S, 'https://www.mec.ca/en/products/deals'],
 // Bare Amazon deal button: drop tag, keep th=1
 ['https://www.amazon.ca/dp/B08LDN5451?th=1&tag=redflagdealsc-20', S, 'https://www.amazon.ca/dp/B08LDN5451?th=1'],
 // Bare merchant URL with CJ + RFD utm params
 ['https://www.canadiantire.ca/?utm_medium=Affiliate&utm_campaign=Hot_Online_Deals&CJEVENT=6bbb38c36a9311e981df00010a24060b&utm_source=RedFlagDeals.com', S, 'https://www.canadiantire.ca/'],
 // MUST BE LEFT ALONE
 ['https://redflagdeals.cheapoair.ca/?FpAffiliate=CJ&FPSub=AID_15734764_PID_749547_CJSID_travel-portal', false, null],
 ['https://www.londondrugs.com/search?q=BUDDYCARE&pickup=true&ship=true&autoFiltersApplied=true', S, null],
 ['https://shop.lululemon.com/en-ca/p/mens-jackets-and-hoodies-jackets/Navigation-Down-Jacket-Evolve-MD/_/prod20007545?color=70108', S, null],
 ['https://www.costco.ca/p/-/meyer-accolade-stainless-steel-skillets-3-pieces/4000239910?langId=-24', S, null],
 ['https://www.amazon.ca/dp/B08LDN5451?th=1', S, null],
 ['https://ad.doubleclick.net/ddm/trackclk/N307601.2181304VERTICALSCOPE/B34323703.432094375;dc_trk_aid=625994539;dc_trk_cid=244077725', S, null],
 ['https://forums.redflagdeals.com/hot-deals-f9/', S, null],
 ['https://www.redflagdeals.com/alerts/insert?source=deal&alerts_form=1&alert_keywords=Amazon.ca', S, null],
 ['https://www.canadiantire.ca/', S, null],
 // A wrapper found OUTSIDE deal content still gets unwrapped (allowStripOnly=false)
 ['http://go.redirectingat.com/?id=130832X1694315&xs=1&url=https%3A%2F%2Fwww.yeti.ca%2Fcustomize', false, 'https://www.yeti.ca/customize'],
 // ...but a bare tracking-param URL outside deal content is left alone
 ['https://www.canadiantire.ca/?utm_medium=Affiliate&CJEVENT=abc&utm_source=RedFlagDeals.com', false, null],
 // Encoding fidelity through a Skimlinks payload. `%2B` is a literal plus and
 // `+` would be a space, so a decode too many silently changes the search
 // terms; `%C2%AE` in the path is the URL parser's own normalisation of `®`.
 ['http://go.redirectingat.com/?id=130832X1694315&xs=1&url=https%3A%2F%2Fwww.amazon.ca%2FBarista-Express%25C2%25AE-Espresso%2Fdp%2FB0BBYNPV33%2Fref%3Dsr_1_1%3Fcrid%3D1C8RJZ2YOC7VE%26keywords%3DBreville%252BBarista%26ufe%3Dapp_do%253Aamzn1.fos.abc%26th%3D1%26tag%3Dredflagdealsc-20', S,
  'https://www.amazon.ca/Barista-Express%C2%AE-Espresso/dp/B0BBYNPV33/ref=sr_1_1?crid=1C8RJZ2YOC7VE&keywords=Breville%2BBarista&ufe=app_do%3Aamzn1.fos.abc&th=1'],
 // Parameters that are nobody's tracking: left byte-for-byte alone, because
 // re-serialising a query can change escaping that was fine as it was.
 ['https://www.lego.com/en-ca/x?offset=0&locale=en-ca&slug.i0=sales-and-deals', S, null],
 ['https://example.com/a?b=c%3Ad&e=f,g&h=i+j', S, null],
 // A valueless parameter ahead of the destination must not be misread as it.
 ['http://go.redirectingat.com/?xs&url=https%3A%2F%2Fwww.mec.ca%2Fen', S, 'https://www.mec.ca/en'],
 // A redirector we cannot read the destination out of stays untouched.
 ['http://go.redirectingat.com/?id=130832X1694315&xs=1', S, null],
 ['https://bestbuyca.o93x.net/c/341376/644465/10221', S, null],
];

let pass = 0;
const failures = [];
for (const [href, allowStripOnly, want] of cases) {
  const got = cleanUrl(href, { allowStripOnly });
  if (got === want) pass += 1;
  else failures.push({ href, want, got });
}

for (const f of failures) {
  console.error('FAIL  in: ' + f.href);
  console.error('    want: ' + f.want);
  console.error('     got: ' + f.got);
}
console.log(pass + ' passed, ' + failures.length + ' failed');
if (failures.length) process.exit(1);
