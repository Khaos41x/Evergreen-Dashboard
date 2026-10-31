import {Browser} from '@capacitor/browser'
import { App } from '@capacitor/app'
import { native } from './transport'
import { handleAuthLink } from './auth'

export async function initializeMobile(){
  if(!native)return
  document.documentElement.dataset.native='true'
  document.documentElement.dataset.platform=(await App.getInfo()).id?'native':''
  const report=(error:unknown)=>window.dispatchEvent(new CustomEvent('evergreen:native-error',{detail:error instanceof Error?error.message:'Não foi possível abrir o link.'}))
  await App.addListener('appStateChange',({isActive})=>{
    document.documentElement.dataset.appActive=String(isActive)
    window.dispatchEvent(new Event(isActive?'evergreen:resume':'evergreen:pause'))
    if(isActive)window.dispatchEvent(new Event('focus'))
  })
  await App.addListener('appUrlOpen',({url})=>{void handleAuthLink(url).catch(report)})
  const launch=await App.getLaunchUrl();if(launch?.url)void handleAuthLink(launch.url).catch(report)
  await App.addListener('backButton',()=>{
    const dialog=document.querySelector('[role=dialog]')
    if(dialog){dialog.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return}
    const event=new Event('evergreen:back',{cancelable:true});if(!window.dispatchEvent(event))return
    if(history.length>1)history.back();else void App.minimizeApp()
  })
  // Links to documents/providers stay outside the trusted local app origin.
  document.addEventListener('click',event=>{
    const link=(event.target as Element)?.closest('a[href]') as HTMLAnchorElement|null
    if(!link||!/^https?:/.test(link.href))return
    event.preventDefault();void Browser.open({url:link.href}).catch(report)
  })
}
