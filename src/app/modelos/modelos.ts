import { RsaPublicKey } from './clave-rsa'

export interface DatosCifradoAES {
    mensaje: string
    iv: string
}

export interface MensajeRecibidoCifrado {
    usuario: string
    mensaje: string
    iv: string
}

export interface Mensaje {
    usuario: string
    mensaje: string
}

export interface Usuario {
    nombre: string
    publicKey: RsaPublicKey
}

export interface enviarUsuario {
    nombre: string
    eHex: string
    nHex: string
}