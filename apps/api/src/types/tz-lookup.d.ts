declare module 'tz-lookup' {
    /** Devuelve la zona horaria IANA para unas coordenadas (lat, lng). */
    export default function tzlookup(latitude: number, longitude: number): string;
}
