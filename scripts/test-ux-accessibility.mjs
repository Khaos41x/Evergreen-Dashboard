import {spawnSync} from 'node:child_process'
const result=spawnSync(process.execPath,['scripts/collaboration-ui-check.mjs'],{env:{...process.env,COLLAB_SURFACES:'1',COLLAB_ATLAS:'1',UX_ITEM:'P2',COLLAB_WIDTHS:process.env.UX_WIDTHS||'320,734'},stdio:'inherit',windowsHide:true})
process.exit(result.status??1)
