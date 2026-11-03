import {Capacitor} from '@capacitor/core'

export function registerPWA(){
 if(!import.meta.env.PROD||Capacitor.isNativePlatform()||!window.isSecureContext||!('serviceWorker' in navigator))return
 const register=()=>void navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(registration=>registration.update()).catch(()=>{})
 if(document.readyState==='complete')register();else window.addEventListener('load',register,{once:true})
}
