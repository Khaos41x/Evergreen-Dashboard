import { spawnSync } from 'node:child_process'
const heights = process.env.UX_HEIGHTS?.split(',') ?? ['480','600','715','900']
for (const height of heights) {
  const result = spawnSync(process.execPath, ['scripts/collaboration-ui-check.mjs'], {
    env: { ...process.env, COLLAB_SURFACES:'1', COLLAB_ATLAS:'1', COLLAB_UX:'1',
      COLLAB_HEIGHT:height, COLLAB_WIDTHS: process.env.UX_WIDTHS ?? '390,734,1024,1440' },
    stdio:'inherit', windowsHide:true,
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
