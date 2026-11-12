import type { AppState } from './types';

export interface Product {
  id: string; name: string; presentation: string; laboratory: string; specialty: string; type: string;
  imageUrl?: string; priceCents: number; originalPriceCents?: number; stock: number;
  requiresPrescription: boolean; programId?: string; description: string;
  catalogItemId?: string;
  provider?: { id: string; name: string; isKlini?: boolean };
  /** Catalog grouping only. Cart/order snapshots keep the selected concrete offer. */
  offers?: PharmacyOffer[];
}
export type PharmacyOffer = Omit<Product, 'offers'>;
export interface CartLine { product: Product; quantity: number }
export interface PharmacyAddress { name: string; street: string; neighborhood: string; postalCode: string; reference?: string }
export interface PharmacyOrder {
  id: string; createdAt: string; mode: 'demo'; status: 'preparing' | 'cancelled';
  lines: CartLine[]; address: PharmacyAddress; paymentMethod: 'apple-pay' | 'card';
  subtotalCents: number; shippingCents: number; totalCents: number; prescriptionAccepted: boolean;
}
export interface PharmacyProgramRequest { id: string; programId: string; createdAt: string; status: 'review'; mode: 'demo' }
export interface PharmacyState { cart: CartLine[]; orders: PharmacyOrder[]; programRequests: PharmacyProgramRequest[]; favorites: string[] }
export interface PharmacyDemoOrderInput { lines: CartLine[]; address: PharmacyAddress; paymentMethod: 'apple-pay' | 'card'; prescriptionAccepted: boolean }
export interface PharmacyProgram { id: string; name: string; laboratory: string; discountPercent: number; productIds: string[]; description: string; conditions: string; expiresAt: string }
const DEMO_PRODUCT_ROWS: PharmacyOffer[] = [
  { id:'demo-sunscreen',name:'Protector solar FPS 50',presentation:'50 mL',laboratory:'Lab. Derma',specialty:'Dermatología',type:'Cuidado personal',priceCents:32000,originalPriceCents:36000,stock:20,requiresPrescription:false,description:'Protector solar de demostración. Consulta las instrucciones del fabricante antes de usarlo.' },
  { id:'demo-cleanser',name:'Gel limpiador',presentation:'200 mL',laboratory:'Lab. Derma',specialty:'Dermatología',type:'Cuidado personal',priceCents:18000,stock:25,requiresPrescription:false,description:'Gel limpiador de demostración para la rutina de cuidado personal.' },
  { id:'demo-glucose',name:'Tiras de glucosa',presentation:'50 piezas',laboratory:'SaludLab',specialty:'Endocrinología',type:'Dispositivo médico',priceCents:24000,stock:10,requiresPrescription:false,description:'Producto de demostración. Verifica la compatibilidad con tu dispositivo.' },
  { id:'demo-medicine',name:'Medicamento A',presentation:'20 tabletas',laboratory:'Lab. Alba',specialty:'Medicina general',type:'Medicamento',priceCents:21000,stock:12,requiresPrescription:true,programId:'continuidad',description:'Producto ficticio para demostrar el flujo de receta. No constituye una indicación médica.' },
];
const DEMO_SELLERS = [
  { id: '9001', name: 'Klini', isKlini: true },
  { id: '9002', name: 'Farmasoma', isKlini: false },
  { id: '9003', name: 'Surtiplaza', isKlini: false },
  { id: '9004', name: 'Distribuidor C', isKlini: false },
];
const DEMO_PRICE_OFFSETS = [0, -1500, -1000, 1000];
export const DEMO_PRODUCTS: Product[] = DEMO_PRODUCT_ROWS.map(row => {
  const offers: PharmacyOffer[] = DEMO_SELLERS.map((provider, index) => ({
    ...row,
    id: row.id + ['', '-farmasoma', '-surtiplaza', '-distribuidor-c'][index],
    catalogItemId: row.id,
    provider: { ...provider },
    priceCents: row.priceCents + DEMO_PRICE_OFFSETS[index],
  }));
  return { ...offers[0], offers };
});
export const DEMO_PROGRAMS: PharmacyProgram[] = [{id:'continuidad',name:'Programa Continuidad',laboratory:'Lab. Alba',discountPercent:10,productIds:['demo-medicine'],description:'10% en productos participantes',conditions:'Participación voluntaria sujeta a validación. No acumulable. La solicitud local no activa descuentos ni atención médica.',expiresAt:'2026-12-31'}];
export const emptyPharmacyState = (): PharmacyState => ({cart:[],orders:[],programRequests:[],favorites:[]});
const object = (v:unknown): v is Record<string,unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v:unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 2000;
const cents = (v:unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= 100000000;
const timestamp = (v:unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
function isPharmacyOffer(v:unknown): v is Product {
  return object(v) && ['id','name','presentation','laboratory','specialty','type'].every(k=>text(v[k])) &&
    typeof v.description==='string' && v.description.trim().length>0 && v.description.length<=4000 && cents(v.priceCents) &&
    (v.originalPriceCents === undefined || (cents(v.originalPriceCents) && v.originalPriceCents >= v.priceCents)) &&
    Number.isSafeInteger(v.stock) && Number(v.stock)>=0 && Number(v.stock)<=1000000 && typeof v.requiresPrescription==='boolean' &&
    (v.catalogItemId===undefined || text(v.catalogItemId)) &&
    (v.provider===undefined || (object(v.provider) && typeof v.provider.id==='string' && /^[1-9]\d{0,14}$/.test(v.provider.id) && text(v.provider.name) && (v.provider.isKlini===undefined || typeof v.provider.isKlini==='boolean'))) &&
    (v.programId===undefined || text(v.programId)) && (v.imageUrl===undefined || (typeof v.imageUrl==='string' && v.imageUrl.length<=2048 && /^https?:\/\//.test(v.imageUrl)));
}
export function isPharmacyProduct(v:unknown): v is Product {
  return isPharmacyOffer(v) && (v.offers===undefined || (Array.isArray(v.offers) && v.offers.length<=10000 &&
    v.offers.every(offer=>isPharmacyOffer(offer) && (!object(offer) || offer.offers===undefined) &&
      (v.catalogItemId===undefined || offer.catalogItemId===v.catalogItemId)) &&
    new Set(v.offers.map(offer=>offer.id)).size===v.offers.length));
}
/** Copy a concrete offer, never its alternative sellers, into a cart or order. */
export function pharmacyOfferSnapshot(product:Product): PharmacyOffer {
  const offer={...product};
  delete offer.offers;
  return { ...offer, ...(offer.provider ? {provider:{...offer.provider}} : {}) };
}
/** One explicitly configured Klini offer, then up to three other sellers, in catalog order. */
export function getPharmacyOffers(product:Product): Product[] {
  if (!isPharmacyProduct(product)) return [];
  const offers = product.offers ?? [product];
  const seenIds=new Set<string>();
  const seenProviders=new Set<string>();
  let klini:Product|undefined;
  const distributors:Product[]=[];
  for (const offer of offers) {
    if (!offer.stock || seenIds.has(offer.id) || (offer.provider && seenProviders.has(offer.provider.id))) continue;
    seenIds.add(offer.id);
    if (offer.provider) seenProviders.add(offer.provider.id);
    if (offer.provider?.isKlini===true) { if (!klini) klini=pharmacyOfferSnapshot(offer); }
    else if (distributors.length<3) distributors.push(pharmacyOfferSnapshot(offer));
  }
  return klini ? [klini,...distributors] : distributors;
}
export function isPharmacyCart(v:unknown): v is CartLine[] {
  return Array.isArray(v) && v.length<=100 && v.every(line=>object(line) && isPharmacyProduct(line.product) && typeof line.quantity === 'number' && Number.isSafeInteger(line.quantity) && line.quantity>0 && line.quantity<=99 && line.quantity<=line.product.stock) && new Set(v.map(l=>l.product.id)).size===v.length;
}
export function pharmacyTotals(lines:CartLine[], shippingCents=4900) {
  if (!isPharmacyCart(lines) || !cents(shippingCents)) throw new Error('Revisa las cantidades, existencias e importes del carrito.');
  const subtotalCents=lines.reduce((sum,line)=>sum+line.product.priceCents*line.quantity,0);
  const shipping=lines.length?shippingCents:0;
  if (!Number.isSafeInteger(subtotalCents+shipping) || subtotalCents+shipping>100000000) throw new Error('El importe del carrito supera el límite permitido.');
  return {subtotalCents,shippingCents:shipping,totalCents:subtotalCents+shipping};
}
export function isPharmacyAddress(v:unknown): v is PharmacyAddress {
  return object(v) && ['name','street','neighborhood'].every(k=>text(v[k])) && typeof v.postalCode==='string' && /^\d{5}$/.test(v.postalCode) && (v.reference===undefined || (typeof v.reference==='string' && v.reference.length<=500));
}
function isOrder(v:unknown): v is PharmacyOrder {
  if (!object(v) || !text(v.id) || !timestamp(v.createdAt) || v.mode!=='demo' || !['preparing','cancelled'].includes(String(v.status)) || !isPharmacyCart(v.lines) || !v.lines.length || !isPharmacyAddress(v.address) || !['apple-pay','card'].includes(String(v.paymentMethod)) || typeof v.prescriptionAccepted!=='boolean') return false;
  if (v.lines.some(l=>l.product.requiresPrescription) && !v.prescriptionAccepted) return false;
  try { const total=pharmacyTotals(v.lines); return Object.entries(total).every(([key,value])=>v[key]===value); } catch {return false;}
}
export function isPharmacyState(v:unknown): v is PharmacyState {
  return object(v) && isPharmacyCart(v.cart) && Array.isArray(v.orders) && v.orders.every(isOrder) && new Set(v.orders.map(o=>o.id)).size===v.orders.length &&
    Array.isArray(v.programRequests) && v.programRequests.every(r=>object(r) && text(r.id) && text(r.programId) && timestamp(r.createdAt) && r.status==='review' && r.mode==='demo') &&
    new Set(v.programRequests.map(r=>r.programId)).size===v.programRequests.length && new Set(v.programRequests.map(r=>r.id)).size===v.programRequests.length &&
    Array.isArray(v.favorites) && v.favorites.every(text) && new Set(v.favorites).size===v.favorites.length;
}
export interface PharmacyFilters { query?:string; specialty?:string; type?:string; laboratory?:string; promotionsOnly?:boolean; programsOnly?:boolean }
const normalized=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function filterPharmacyProducts(products:Product[],filters:PharmacyFilters={}) {
  const q=normalized(filters.query??'');
  return products.filter(p=>(!q || normalized([p.name,p.laboratory,p.presentation].join(' ')).includes(q)) && (!filters.specialty || p.specialty===filters.specialty) && (!filters.type || p.type===filters.type) && (!filters.laboratory || p.laboratory===filters.laboratory) && (!filters.promotionsOnly || (p.originalPriceCents??p.priceCents)>p.priceCents) && (!filters.programsOnly || !!p.programId));
}
export function createPharmacyDemoOrder(input:PharmacyDemoOrderInput,id:string,now=Date.now()):PharmacyOrder {
  if (!isPharmacyCart(input.lines) || !input.lines.length) throw new Error('Agrega productos disponibles antes de continuar.');
  // Demo checkout is authoritative against the demo catalog, never a client-supplied price or live product.
  const lines=input.lines.map(line=>{
    const product=DEMO_PRODUCTS.flatMap(p=>p.offers??[p]).find(p=>p.id===line.product.id);
    if (!product || product.priceCents!==line.product.priceCents || product.stock<line.quantity) throw new Error('El precio o la disponibilidad cambió. Vuelve al catálogo de demostración.');
    if (line.product.provider && (line.product.provider.id!==product.provider?.id || line.product.provider.name!==product.provider?.name || line.product.provider.isKlini!==product.provider?.isKlini)) throw new Error('El distribuidor cambió. Vuelve al catálogo de demostración.');
    if (line.product.catalogItemId!==undefined && line.product.catalogItemId!==product.catalogItemId) throw new Error('El producto cambió. Vuelve al catálogo de demostración.');
    return {product:pharmacyOfferSnapshot(product),quantity:line.quantity};
  });
  const order:PharmacyOrder={id,createdAt:new Date(now).toISOString(),mode:'demo',status:'preparing',lines,address:{...input.address},paymentMethod:input.paymentMethod,prescriptionAccepted:input.prescriptionAccepted,...pharmacyTotals(lines)};
  if (!isOrder(order)) throw new Error('Completa la dirección y la revisión de receta de demostración.');
  return order;
}
export function getProfilePharmacy(state:AppState,profileId:string):PharmacyState|undefined {return state.profile.id===profileId?state.pharmacy:state.family?.profiles[profileId]?.pharmacy;}
export function setProfilePharmacy(state:AppState,profileId:string,pharmacy:PharmacyState|undefined):AppState {
  const scope=state.family?.profiles[profileId];
  if (state.profile.id!==profileId && !scope) throw new Error('No se encontró el perfil de farmacia.');
  const next=state.profile.id===profileId?{...state,pharmacy}:{...state};
  if(scope && state.family) next.family={...state.family,profiles:{...state.family.profiles,[profileId]:{...scope,pharmacy}}};
  return next;
}
export type PharmacyAction = {type:'SET_PHARMACY';profileId:string;pharmacy:PharmacyState};
/** Logical serialization plus the store's existing physical FIFO. Rollback touches only this profile's pharmacy. */
export function createPharmacyWriter(options:{current:()=>AppState;generation:()=>number;publish:(state:AppState)=>void;persist:(state:AppState)=>Promise<void>;reduce:(state:AppState,action:PharmacyAction)=>AppState}) {
  let tail:Promise<unknown>=Promise.resolve();
  return function write<T>(profileId:string,change:(previous:PharmacyState)=>{pharmacy:PharmacyState;result:T}):Promise<T> {
    const generation=options.generation();
    const operation=tail.then(async()=>{
      if(generation!==options.generation()) throw new Error('La operación se canceló al restablecer la demostración.');
      const previous=getProfilePharmacy(options.current(),profileId);
      const {pharmacy,result}=change(previous??emptyPharmacyState());
      const next=options.reduce(options.current(),{type:'SET_PHARMACY',profileId,pharmacy});
      options.publish(next);
      try { await options.persist(next); }
      catch(error) {
        if(generation===options.generation() && getProfilePharmacy(options.current(),profileId)===pharmacy) {
          const rollback=setProfilePharmacy(options.current(),profileId,previous);
          options.publish(rollback); await options.persist(rollback).catch(()=>undefined);
        }
        throw error;
      }
      if(generation!==options.generation()) throw new Error('La operación se canceló al restablecer la demostración.');
      return result;
    });
    tail=operation.catch(()=>undefined); return operation;
  };
}
