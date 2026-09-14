/* Run: node tests/language.cjs. Uses the project's existing TypeScript dependency. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS', name); }
function runtime(storage = new Map()) {
  const events = new Map(), cache = new Map();
  const window = { localStorage: {getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v)}, addEventListener: (k,v) => events.set(k,v), removeEventListener: k => events.delete(k) };
  const context = vm.createContext({ window, Intl, Date, console });
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file,'utf8'));
    const m = {exports:{}}; cache.set(file,m.exports);
    const js = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
    const fn = vm.runInContext('(function(require,module,exports){'+js+'\n})',context);
    fn(spec=>load(path.resolve(path.dirname(file),spec)+(path.extname(spec)?'':'.ts')),m,m.exports); return m.exports;
  }
  return {i18n:load(path.join(root,'lib/i18n.ts')), store:load(path.join(root,'lib/language-store.ts')), window, events, context};
}
const {i18n:i}=runtime();
check('English default, no saved choice',()=>{const {store}=runtime();store.initializeLanguage();assert.equal(store.getLanguage(),'en');});
check('Bangla persists across reload; offline without fetch',()=>{const storage=new Map(),first=runtime(storage);first.store.initializeLanguage();assert.equal(first.store.setLanguage('bn'),true);const second=runtime(storage);second.store.initializeLanguage();assert.equal(second.store.getLanguage(),'bn');assert.equal(second.store.getServerLanguage(),'en');});
check('Invalid saved locale falls back to English',()=>{const {store}=runtime(new Map([['jasimflow:language','xx']]));store.initializeLanguage();assert.equal(store.getLanguage(),'en');});
check('Storage failure still allows session language',()=>{const r=runtime();r.window.localStorage.getItem=()=>{throw Error('blocked')};r.window.localStorage.setItem=()=>{throw Error('blocked')};r.store.initializeLanguage();assert.equal(r.store.setLanguage('bn'),false);assert.equal(r.store.getLanguage(),'bn');});
check('Cross-tab changes and removal notify subscribers',()=>{const r=runtime();let calls=0;const stop=r.store.subscribeLanguage(()=>calls++);r.store.initializeLanguage();r.events.get('storage')({key:'jasimflow:language',newValue:'bn'});assert.equal(r.store.getLanguage(),'bn');r.events.get('storage')({key:'jasimflow:language',newValue:null});assert.equal(r.store.getLanguage(),'en');assert.equal(calls,3);stop();assert.equal(r.events.has('storage'),false);});
check('Server language remains English after browser choice',()=>{const r=runtime();r.store.setLanguage('bn');delete r.context.window;assert.equal(r.store.getLanguage(),'en');});
check('Labels, loan kinds and dates switch languages',()=>{assert.equal(i.translate('সেটিংস','en'),'Settings');assert.equal(i.translate('সেটিংস','bn'),'সেটিংস');assert.equal(i.kindName('borrow','en'),'Borrowed money');assert.equal(i.kindName('borrow','bn'),'ঋণ নিয়েছি');assert.match(i.localizedDate('2026-09-14','en'),/14/);assert.match(i.localizedDate('2026-09-14','bn'),/১৪/);});
check('Custom categories stay unchanged in either language',()=>{for(const lang of ['en','bn']){assert.equal(i.categoryName('আমার দোকান',lang),'আমার দোকান');assert.equal(i.categoryName('খাবার',lang),'খাবার');}assert.equal(i.categoryName('Food','en'),'Food');assert.equal(i.categoryName('Food','bn'),'খাবার');});
check('Placeholder values are inserted without translating personal text',()=>{assert.equal(i.translate('{0} নাম বদলাও','en',['খাবার']),'Rename খাবার');assert.equal(i.translate('Favourite {0}','bn',['রহিম $& {1}']),'রহিম $& {1} পছন্দের তালিকায়');assert.equal(i.translate('{0}টি বাকি','en',[3]),'3 pending');});
check('Canonical validation errors translate without changing engine messages',()=>{assert.equal(i.translate('ক্যাটাগরি বেছে নাও।','en'),'Choose a category.');assert.equal(i.translate('সঠিক বাজেট লিখুন।','en'),'Enter a valid budget.');});
check('Every translated UI key and backend Bangla message has English text',()=>{
  for(const file of ['components/hisab-app.tsx','components/quick-entry.tsx','components/pulse-ledger.tsx','lib/service.ts','lib/client-api.ts','lib/ledger.ts','public/jf-offline.js','app/api/hisab/route.ts']){
    const sf=ts.createSourceFile(file,fs.readFileSync(path.join(root,file),'utf8'),99,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
    function walk(n){
      if(ts.isCallExpression(n)&&n.expression.getText(sf)==='t'&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0])){const key=n.arguments[0].text;if(/[\u0980-\u09df]/.test(key))assert.ok(i.englishMessages[key],file+': '+key);}
      if(!file.endsWith('tsx')&&ts.isStringLiteral(n)&&/[\u0980-\u09df]/.test(n.text)&&n.text.length>12)assert.ok(i.englishMessages[n.text],file+': '+n.text);
      ts.forEachChild(n,walk);
    }walk(sf);
  }
});
check('Note and channel inputs are outside collapsed details and still optional',()=>{
  const source=fs.readFileSync(path.join(root,'components/quick-entry.tsx'),'utf8');
  const sf=ts.createSourceFile('quick-entry.tsx',source,99,true,ts.ScriptKind.TSX);let visible=0;
  function walk(n){if(ts.isJsxSelfClosingElement(n)&&n.tagName.getText(sf)==='input'){
    const id=n.attributes.properties.find(p=>ts.isJsxAttribute(p)&&p.name.getText(sf)==='id')?.getText(sf)||'';
    if(/entry-(note|channel)/.test(id)){
      for(let p=n.parent;p;p=p.parent)if(ts.isJsxElement(p))assert.notEqual(p.openingElement.tagName.getText(sf),'details');
      assert.ok(!n.attributes.properties.some(p=>p.name?.getText(sf)==='required'));visible++;
    }
  }ts.forEachChild(n,walk);}walk(sf);assert.equal(visible,2);
});
console.log(`${checks} language and entry layout checks passed`);
