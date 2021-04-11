import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import * as bigintConversion from 'bigint-conversion';
import * as bcu from 'bigint-crypto-utils';
import { Mensaje } from '../modelos/mensaje';
import { MensajeRecibidoCifrado } from '../modelos/mensaje-cifrado';
import { DatoscifradoAES } from '../modelos/datoscifrado-aes';

@Injectable({
  providedIn: 'root'
})
export class PruebaService {

  keyAES: CryptoKey;
  keyRSAe: bigint;
  keyRSAn: bigint;

  constructor(private http: HttpClient) { }

  getMensajeRSA(mensaje: Mensaje): Promise<Mensaje> {
    return new Promise((resolve, reject) => {
      this.http.post<MensajeRecibidoCifrado>(environment.apiURL + "/mensajeRSA", mensaje).subscribe(async data => {
        try {
          const decrypted: ArrayBuffer = await crypto.subtle.decrypt(
            {
              name: "AES-GCM",
              iv: new Uint8Array(bigintConversion.hexToBuf(data.iv))
            },
            this.keyAES,
            new Uint8Array(bigintConversion.hexToBuf(data.mensaje))
          )
          const mensajeDescifrado: Mensaje = {
            usuario: data.usuario,
            mensaje: bigintConversion.bufToText(decrypted)
          }
          resolve(mensajeDescifrado) 
        } catch (error) {
          reject(error)
        }
      })
    })
  }

  getMensajeAES(mensaje: Mensaje, iv: string, tag: string): Promise<Mensaje> {
    const enviar = {
      usuario: mensaje.usuario,
      mensaje: mensaje.mensaje,
      iv: iv,
      tag: tag
    }

    return new Promise((resolve, reject) => {
      this.http.post<MensajeRecibidoCifrado>(environment.apiURL + "/mensajeAES", enviar).subscribe(async data => {
        try {
          const decrypted: ArrayBuffer = await crypto.subtle.decrypt(
            {
              name: "AES-GCM",
              iv: new Uint8Array(bigintConversion.hexToBuf(data.iv))
            },
            this.keyAES,
            new Uint8Array(bigintConversion.hexToBuf(data.mensaje))
          )
          const mensajeDescifrado: Mensaje = {
            usuario: data.usuario,
            mensaje: bigintConversion.bufToText(decrypted)
          }
          resolve(mensajeDescifrado) 
        } catch (error) {
          reject(error)
        }
      })
    })
  }
  async getClaves() {
    const keyAESHex = "95442fa551e13eacedea3e79f0ec1e63513cc14a9dbc4939ad70ceb714b44b8f";
    const keyAESBuffer: ArrayBuffer = new Uint8Array(bigintConversion.hexToBuf(keyAESHex));
    this.keyAES = await crypto.subtle.importKey(
      "raw",
      keyAESBuffer,
      "AES-GCM",
      true,
      ["encrypt", "decrypt"]
    )
    this.http.get<any>(environment.apiURL + "/rsa").subscribe(data => {
      this.keyRSAe = bigintConversion.hexToBigint(data.publicKey.e);
      this.keyRSAn = bigintConversion.hexToBigint(data.publicKey.n);
    });
  }

  encriptarRSA(mensaje: string): string {
    const mensajeBigint: bigint = bigintConversion.textToBigint(mensaje);
    const mensajeCifrado: bigint = bcu.modPow(mensajeBigint, this.keyRSAe, this.keyRSAn)
    return bigintConversion.bigintToHex(mensajeCifrado)
  }

  async encriptarAES(mensaje: string): Promise<DatoscifradoAES> {
    const mensajeBuffer = bigintConversion.textToBuf(mensaje);
    const iv: Uint8Array = window.crypto.getRandomValues(new Uint8Array(12))
    const mensajeCifrado: ArrayBuffer = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
    }, 
    this.keyAES, 
    mensajeBuffer
    )

    const mensajeCifradoHex: string = bigintConversion.bufToHex(mensajeCifrado)
    return {
      mensaje: mensajeCifradoHex.slice(0, mensajeCifradoHex.length - 32),
      iv: bigintConversion.bufToHex(iv),
      tag: mensajeCifradoHex.slice(mensajeCifradoHex.length - 32, mensajeCifradoHex.length)
    }
  }
}
