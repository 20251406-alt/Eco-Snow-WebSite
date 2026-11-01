import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { emptyStore, compare } from '../app/admin/domain.ts';
const source=readFileSync(new URL('../app/admin/demo.ts',import.meta.url),'utf8').replace('"./domain"',JSON.stringify(new URL('../app/admin/domain.ts',import.meta.url).href));
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {withDemo,DEMO_ORG_ID}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
test('demo data preserves existing records, is idempotent and excluded from performance',()=>{
 const original=emptyStore();original.organizations.push({id:'existing',name:'기존 기관',administrator:'담당자',createdAt:'',updatedAt:''});
 const seeded=withDemo(original);assert.equal(original.organizations.length,1);assert.equal(seeded.organizations[0].id,'existing');assert.equal(seeded.zones.length,2);assert.equal(seeded.works.length,2);assert.equal(withDemo(seeded),seeded);assert.ok(seeded.works.every(w=>w.demo));assert.equal(compare(seeded,DEMO_ORG_ID).current.kg,null);assert.equal(compare(seeded,DEMO_ORG_ID).stage,null);assert.equal(seeded.works[0].calculation.kg,2.4);assert.equal(seeded.works[0].applications.reduce((s,a)=>s+a.kg,0),3);assert.equal(seeded.works[1].stage,'작성 중');
});
