import assert from 'node:assert/strict'
import {periodDates,previousPeriod,goalState,percentageChange,csvCell} from '../src/features/holding/financial-model.ts'
import {layoutWorld} from '../src/features/world/model.ts'
assert.deepEqual(periodDates('Quinzenal','2026-02-10'),{from:'2026-02-01',to:'2026-02-15'})
assert.deepEqual(periodDates('Quinzenal','2026-02-20'),{from:'2026-02-16',to:'2026-02-28'})
assert.deepEqual(periodDates('Quinzenal','2028-02-20'),{from:'2028-02-16',to:'2028-02-29'})
assert.deepEqual(periodDates('Últimos 15 dias','2026-03-05'),{from:'2026-02-19',to:'2026-03-05'})
assert.deepEqual(periodDates('Semanal','2026-10-25'),{from:'2026-10-19',to:'2026-10-25'})
assert.deepEqual(periodDates('Trimestral','2026-10-30'),{from:'2026-10-01',to:'2026-10-30'})
assert.deepEqual(previousPeriod('2026-03-01','2026-03-31'),{from:'2026-01-29',to:'2026-02-28'})
assert.equal(goalState('expense_limit',10001n,10000n,'2026-10-20','2026-10-30').label,'Limite excedido')
assert.equal(goalState('expense_limit',8000n,10000n,'2026-10-20','2026-10-30').label,'Concluída dentro do limite')
assert.equal(percentageChange(9000000000000000n,6000000000000000n),'+50%')
assert.equal(csvCell('=HYPERLINK("bad")'),'"\'=HYPERLINK(""bad"")"')
const a=layoutWorld(1,0),b=layoutWorld(12,6);assert.equal(a.width,b.width);assert.equal(a.depth,b.depth);assert.deepEqual(a.stations[0],b.stations[0]);assert.deepEqual(layoutWorld(1,0,[11]).stations[0],b.stations[11]);assert.ok(b.stations.every(([x])=>Math.abs(x)>1.5));
console.log('Model assertions passed: calendar periods/leap year, exact variations, expense ceilings, CSV injection protection, stable office/vault bounds and central aisle.')
