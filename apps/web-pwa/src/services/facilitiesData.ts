/**
 * Healthcare facility directory data.
 *
 * !! DATA STATUS: SAMPLE / UNVERIFIED !!
 * Institution names marked isSample:false are real, publicly known facilities, but their phone numbers,
 * services and coordinates have NOT been confirmed against an official source, so `phone` and
 * `verifiedDate` are null. Entries with isSample:true are illustrative placeholders for typical PHC /
 * Comprehensive Health Centre contexts (urban and rural) and may not exist under that exact name.
 *
 * Before release, replace this file's contents with records from the Federal Ministry of Health's Health
 * Facility Registry / Master Facility List (https://hfr.health.gov.ng) or state ministry data, fill in
 * `phone`, and set `verifiedDate` (YYYY-MM-DD) ONLY for records someone actually confirmed. The UI shows a
 * "Verified <date>" badge only when `verifiedDate` is set, and the Call button only when `phone` is set.
 * Coordinates are approximate (town/district level) and are used only for a rough straight-line distance.
 */

export type FacilityType = 'phc' | 'general_hospital' | 'maternity_home' | 'tertiary'
export type ServiceId =
  | 'anc'
  | 'immunization'
  | 'emonc'
  | 'labour_delivery'
  | 'family_planning'
  | 'postnatal'
  | 'newborn_care'

export interface Facility {
  id: string
  name: string
  facilityType: FacilityType
  address: string
  state: string
  lga: string
  /** International format, e.g. "+2348012345678". null = not on file (Call button hidden). */
  phone: string | null
  emergencyServices: boolean
  /** YYYY-MM-DD of the last real verification, or null if never verified. */
  verifiedDate: string | null
  servicesOffered: ServiceId[]
  /** Approximate coordinates (rough distance only). */
  lat: number
  lng: number
  /** Illustrative placeholder rather than a confirmed record. */
  isSample: boolean
}

export const FACILITIES: Facility[] = [
  {
    id: 'fct-national-hospital',
    name: 'National Hospital Abuja',
    facilityType: 'tertiary',
    address: 'Plot 132, Central Business District, Garki, Abuja',
    state: 'FCT Abuja',
    lga: 'Abuja Municipal Area Council',
    phone: null,
    emergencyServices: true,
    verifiedDate: null,
    servicesOffered: ['anc', 'emonc', 'labour_delivery', 'postnatal', 'newborn_care', 'immunization', 'family_planning'],
    lat: 9.0535,
    lng: 7.4867,
    isSample: false,
  },
  {
    id: 'fct-wuse-general',
    name: 'Wuse General Hospital',
    facilityType: 'general_hospital',
    address: 'Wuse District, Abuja',
    state: 'FCT Abuja',
    lga: 'Abuja Municipal Area Council',
    phone: null,
    emergencyServices: true,
    verifiedDate: null,
    servicesOffered: ['anc', 'emonc', 'labour_delivery', 'postnatal', 'immunization', 'family_planning'],
    lat: 9.0765,
    lng: 7.4786,
    isSample: false,
  },
  {
    id: 'fct-kubwa-phc',
    name: 'Kubwa Primary Health Centre',
    facilityType: 'phc',
    address: 'Kubwa, Abuja',
    state: 'FCT Abuja',
    lga: 'Bwari',
    phone: null,
    emergencyServices: false,
    verifiedDate: null,
    servicesOffered: ['anc', 'immunization', 'family_planning', 'postnatal'],
    lat: 9.1517,
    lng: 7.3283,
    isSample: true,
  },
  {
    id: 'kano-mmsh',
    name: 'Murtala Muhammad Specialist Hospital',
    facilityType: 'general_hospital',
    address: 'Kano city',
    state: 'Kano',
    lga: 'Kano Municipal',
    phone: null,
    emergencyServices: true,
    verifiedDate: null,
    servicesOffered: ['anc', 'emonc', 'labour_delivery', 'postnatal', 'newborn_care', 'immunization'],
    lat: 12.0022,
    lng: 8.5167,
    isSample: false,
  },
  {
    id: 'kano-kumbotso-chc',
    name: 'Kumbotso Comprehensive Health Centre',
    facilityType: 'phc',
    address: 'Kumbotso, Kano',
    state: 'Kano',
    lga: 'Kumbotso',
    phone: null,
    emergencyServices: true,
    verifiedDate: null,
    servicesOffered: ['anc', 'emonc', 'labour_delivery', 'immunization', 'postnatal', 'family_planning'],
    lat: 11.957,
    lng: 8.512,
    isSample: true,
  },
  {
    id: 'kano-gezawa-phc',
    name: 'Gezawa Primary Health Centre',
    facilityType: 'phc',
    address: 'Gezawa town (rural), Kano',
    state: 'Kano',
    lga: 'Gezawa',
    phone: null,
    emergencyServices: false,
    verifiedDate: null,
    servicesOffered: ['anc', 'immunization', 'family_planning'],
    lat: 12.0833,
    lng: 8.7333,
    isSample: true,
  },
  {
    id: 'lagos-limh',
    name: 'Lagos Island Maternity Hospital',
    facilityType: 'maternity_home',
    address: 'Lagos Island, Lagos',
    state: 'Lagos',
    lga: 'Lagos Island',
    phone: null,
    emergencyServices: true,
    verifiedDate: null,
    servicesOffered: ['anc', 'emonc', 'labour_delivery', 'postnatal', 'newborn_care', 'immunization', 'family_planning'],
    lat: 6.4541,
    lng: 3.3947,
    isSample: false,
  },
  {
    id: 'lagos-luth',
    name: 'Lagos University Teaching Hospital (LUTH)',
    facilityType: 'tertiary',
    address: 'Idi-Araba, Lagos',
    state: 'Lagos',
    lga: 'Mushin',
    phone: null,
    emergencyServices: true,
    verifiedDate: null,
    servicesOffered: ['anc', 'emonc', 'labour_delivery', 'postnatal', 'newborn_care', 'immunization'],
    lat: 6.5167,
    lng: 3.358,
    isSample: false,
  },
  {
    id: 'lagos-ikorodu-general',
    name: 'Ikorodu General Hospital',
    facilityType: 'general_hospital',
    address: 'Ikorodu, Lagos',
    state: 'Lagos',
    lga: 'Ikorodu',
    phone: null,
    emergencyServices: true,
    verifiedDate: null,
    servicesOffered: ['anc', 'emonc', 'labour_delivery', 'immunization', 'postnatal'],
    lat: 6.6194,
    lng: 3.5105,
    isSample: false,
  },
  {
    id: 'lagos-ajegunle-phc',
    name: 'Ajegunle Primary Health Centre',
    facilityType: 'phc',
    address: 'Ajegunle, Lagos',
    state: 'Lagos',
    lga: 'Ajeromi-Ifelodun',
    phone: null,
    emergencyServices: false,
    verifiedDate: null,
    servicesOffered: ['anc', 'immunization', 'family_planning', 'postnatal'],
    lat: 6.4531,
    lng: 3.3333,
    isSample: true,
  },
]

export const hasEmergencyObstetricCare = (f: Facility) => f.emergencyServices && f.servicesOffered.includes('emonc')

/** Straight-line distance in km (haversine). */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(bLat - aLat)
  const dLng = rad(bLng - aLng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
