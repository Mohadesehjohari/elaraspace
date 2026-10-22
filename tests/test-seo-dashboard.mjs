import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

// Load .js as ESM without changing the existing site's module conventions.
const script = readFileSync(new URL('../admin/seo-manager.js', import.meta.url),'utf8');
const mod = await import('data:text/javascript;base64,'+Buffer.from(script).toString('base64'));

const csv='\uFEFFTop queries,Clicks,Impressions,CTR,Position\r\n"پومودورو, آموزش",12,120,10%,5.2\r\n';
const found=mod.parseGscCsv(csv);
assert.equal(found.length,1);
assert.equal(found[0].name,'پومودورو, آموزش');
assert.equal(found[0].clicks,12);
assert.equal(found[0].position,5.2);
assert.throws(()=>mod.parseGscCsv('hello,world\n1,2'),/Clicks/);
const example={articles:[{
  id:'doc-1',seoSlug:'pomodoro',locale:'fa',status:'published',seoNoindex:false,
  title:'عنوان',excerpt:'خلاصه',body:'محتوا',seoTitle:'عنوان اصلی',seoDescription:'توضیح',
  seoKeyword:'تمرکز',coverUrl:''
},{id:'draft-1',status:'draft',seoSlug:'hidden',title:'draft'}],pages:[]};
const snapshot=mod.buildSeoSnapshot(example,'https://example.org/');
assert.equal(snapshot.articles.length,1);
assert.equal(snapshot.articles[0].status,'published');
assert.equal(snapshot.articles[0].seoNoindex,false);
assert.ok(!JSON.stringify(snapshot).includes('draft-1'));
const duplicates={...example,articles:[example.articles[0],{...example.articles[0],id:'doc-2'}]};
assert.throws(()=>mod.buildSeoSnapshot(duplicates,'https://example.org/'),/تکراری/);
console.log('SEO Studio export and CSV parsing checks passed');
