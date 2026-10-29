import { createHandler } from '../server/app.mjs'
export default createHandler()
export const config = { maxDuration: 60, api: { bodyParser: false } }
