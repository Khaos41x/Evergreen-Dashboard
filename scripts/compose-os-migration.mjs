// Keep companion SQL readable; the migration itself is the deployable source of truth.
import {readFileSync,writeFileSync} from 'node:fs'
const path='supabase/migrations/20261030211959_evergreen_os_v2.sql',marker='-- OS API composition begins'
let source=readFileSync(path,'utf8');source=source.split(marker)[0].replace(/commit;\s*$/,'')
for(const file of ['supabase/os-v2-api.sql','supabase/os-v2-operations.sql','supabase/os-v2-group-levels.sql','supabase/os-v2-shared-channels.sql']){try{source+='\n'+(file.endsWith('api.sql')?marker:'-- OS operations composition begins')+'\n'+readFileSync(file,'utf8')}catch(e){if(e.code!=='ENOENT')throw e}}
writeFileSync(path,source+'\ncommit;\n')
