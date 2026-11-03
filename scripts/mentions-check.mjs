import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
const source=stripTypeScriptTypes(readFileSync('src/collaboration/mentions.ts','utf8'),{mode:'transform'})
const {decodeMentions,encodeMentions,rebaseMentions}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',members=[{user_id:a,display_name:'Davy Peixoto'},{user_id:b,display_name:'Davy Peixoto'}]
let draft=decodeMentions(`Olá @${b}, tudo bem?`,members)
assert.equal(draft.body,'Olá @Davy Peixoto, tudo bem?');assert.equal(draft.mentions[0].userId,b)
assert.equal(encodeMentions(draft.body,draft.mentions,members),`Olá @${b}, tudo bem?`)
let next='Bom dia! '+draft.body,refs=rebaseMentions(draft.body,next,draft.mentions)
assert.equal(encodeMentions(next,refs,members),`Bom dia! Olá @${b}, tudo bem?`)
next=draft.body.replace('Davy','David');assert.equal(rebaseMentions(draft.body,next,draft.mentions).length,0)
assert.equal(encodeMentions('@Davy Peixoto',[],members),'@Davy Peixoto')
assert.equal(encodeMentions(draft.body,draft.mentions,[members[0]]),draft.body)
assert.equal(decodeMentions(`@${b}`,[]).body,'@Pessoa indisponível')
assert.equal(encodeMentions(draft.body,[{...draft.mentions[0],end:9999}],members),draft.body)
console.log(JSON.stringify({passed:8,scope:'Mention identities remain canonical; names in editor, duplicate names, edits and removed members'},null,2))
