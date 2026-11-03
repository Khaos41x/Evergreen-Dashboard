import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const config=readFileSync('supabase/config.toml','utf8')
for(const [name,type]of[['confirmation','signup'],['recovery','recovery'],['magic_link','email']]){
 const template=readFileSync('supabase/templates/'+name+'.html','utf8')
 assert.ok(config.includes('[auth.email.template.'+name+']'))
 assert.match(template,/<html lang="pt-BR">/)
 assert.match(template,/\{\{\s*\.Token\s*\}\}/)
 assert.match(template,/\{\{\s*\.RedirectTo\s*\}\}#token_hash=\{\{\s*\.TokenHash\s*\}\}/)
 assert.ok(template.includes('&amp;type='+type))
 assert.doesNotMatch(template,/localhost|127\.0\.0\.1|\.ConfirmationURL|\.SiteURL/)
}
console.log(JSON.stringify({passed:18,scope:'Three local templates: PT-BR, OTP + fragment link, environment redirect, no hardcoded host. Hosted templates/delivery NOT_VERIFIED.'},null,2))
