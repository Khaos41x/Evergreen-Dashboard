import './EvergreenBrand.css'
/** Original asset supplied by the company. No recoloring, tracing or distortion. */
export function EvergreenBrand({compact=false}:{compact?:boolean}){
 return <img className={compact?'evergreen-brand evergreen-brand-compact':'evergreen-brand'} src="/evergreen-holdings-original.png" alt="Evergreen Holdings" width={512} height={512} decoding="async"/>
}
