import {spawnSync} from 'node:child_process'
for(const [item,widths] of [['P0-2','390,734,1440'],['P1-1','390,734,1440'],['P1-2','390,734,1440'],['P1-3','390,734,1000']]){
 const result=spawnSync(process.execPath,['scripts/collaboration-ui-check.mjs'],{env:{...process.env,COLLAB_SURFACES:'1',COLLAB_ATLAS:'1',UX_ITEM:item,COLLAB_WIDTHS:widths},stdio:'inherit',windowsHide:true})
 if(result.status!==0)process.exit(result.status??1)
}
