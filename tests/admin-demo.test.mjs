import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { emptyStore, compare } from '../app/admin/domain.ts';
const source=readFileSync(new URL('../app/admin/demo.ts',import.meta.url),'utf8').replace('"./domain"',JSON.stringify(new URL('../app/admin/domain.ts',import.meta.url).href));
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {withDemo,DEMO_ORG_ID,demoComparisonData}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
test('demo data preserves existing records, is idempotent and excluded from performance',()=>{
 const original=emptyStore();original.organizations.push({id:'existing',name:'기존 기관',administrator:'담당자',createdAt:'',updatedAt:''});
 const seeded=withDemo(original);assert.equal(original.organizations.length,1);assert.equal(seeded.organizations[0].id,'existing');assert.equal(seeded.zones.length,26);assert.equal(seeded.works.length,146);assert.equal(withDemo(seeded),seeded);assert.ok(seeded.works.every(w=>w.demo));assert.equal(compare(seeded,DEMO_ORG_ID).current.kg,null);assert.equal(compare(seeded,DEMO_ORG_ID).stage,null);assert.equal(seeded.works[0].calculation.kg,2.4);assert.equal(seeded.works[0].applications.reduce((s,a)=>s+a.kg,0),3);assert.equal(seeded.works[1].stage,'후속 확인 대기');assert.equal(seeded.prior.length,26);assert.equal(seeded.settings[DEMO_ORG_ID].policy.finalized,true);assert.ok(seeded.criteria.every(c=>c.verified));assert.equal(compare(seeded,DEMO_ORG_ID).previous,null);assert.ok(seeded.works.every(w=>w.observation.before && (w.followup?.photo || w.stage === "후속 확인 대기")));
});

test('demo year comparison shows quantities and costs without altering actual records',()=>{const d=withDemo(emptyStore());const preview=compare(demoComparisonData(d),DEMO_ORG_ID);assert.equal(preview.previous,d.prior.reduce((n,p)=>n+p.kg,0));assert.equal(preview.current.kg,d.works.flatMap(w=>w.applications).reduce((n,a)=>n+a.kg,0));assert.ok(preview.previous>0);assert.ok(Number.isFinite(preview.savings));assert.equal(preview.priorCost,d.prior.reduce((n,p)=>n+p.cost,0));assert.equal(preview.current.cost,d.works.flatMap(w=>w.applications).reduce((n,a)=>n+a.cost,0));assert.equal(preview.stage,null);assert.equal(compare(d,DEMO_ORG_ID).current.kg,null);assert.ok(d.works.every(w=>w.demo));});
