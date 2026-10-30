import {createHandler} from '../server/app.mjs'
const application=createHandler()
export const config={maxDuration:60,api:{bodyParser:false}}
export default function handler(req:any,res:any){
 const url=new URL(req.url,'https://evergreen.invalid')
 const actualPage=/^\/(vision|economy|founders|hub)$/.exec(url.pathname)?.[1]
 const page=actualPage||url.searchParams.get('__eg_page')
 const route=url.searchParams.get('__eg_route')
 url.searchParams.delete('__eg_page');url.searchParams.delete('__eg_route')
 if(page&&['vision','economy','founders','hub'].includes(page))req.url='/api/page?view='+encodeURIComponent(page)
 else if(url.pathname==='/api/handler'&&route){req.url='/api/'+route+url.search}
 else req.url=url.pathname+url.search
 return application(req,res)
}
