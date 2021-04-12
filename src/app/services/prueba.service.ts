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
  ivFirma: string;
  rBigint: bigint;

  constructor(private http: HttpClient) { }

  async getMensaje(mensaje: Mensaje, cifrado: string): Promise<Mensaje> {
    let enviar;
    if (cifrado === "RSA"){
      const mensajeCifradoBigint: bigint = this.encriptarRSA(bigintConversion.textToBigint(mensaje.mensaje));
      enviar = {
        cifrado: "RSA",
        usuario: mensaje.usuario,
        mensaje: bigintConversion.bigintToHex(mensajeCifradoBigint)
      }
    }

    else{
      const datosAES: DatoscifradoAES = await this.encriptarAES(new Uint8Array (bigintConversion.textToBuf(mensaje.mensaje)));
      enviar = {
        cifrado: "AES",
        usuario: mensaje.usuario,
        mensaje: datosAES.mensaje,
        iv: datosAES.iv,
        tag: datosAES.tag
      }
    }

    return new Promise((resolve, reject) => {
      this.http.post<MensajeRecibidoCifrado>(environment.apiURL + "/mensaje", enviar).subscribe(async data => {
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

  async getFirma(mensaje: Mensaje): Promise<Mensaje> {
    const mensajeCegado: bigint = this.cegarRSA(bigintConversion.textToBigint(mensaje.mensaje));
    mensaje.mensaje = bigintConversion.bigintToHex(mensajeCegado)
    return new Promise((resolve, reject) => {
      this.http.post<MensajeRecibidoCifrado>(environment.apiURL + "/firma", mensaje).subscribe(async data => {
        const mensajeDescegado: bigint = this.descegarRSA(bigintConversion.hexToBigint(data.mensaje));
        const mensajeVerificado: bigint = this.verificarRSA(mensajeDescegado)
        const mensajeDescifrado: Mensaje = {
          usuario: data.usuario,
          mensaje: bigintConversion.bigintToText(mensajeVerificado)
        }
        resolve(mensajeDescifrado)
      }, error => {
        reject(error)
      })
    })
  }

  async getClaves(): Promise<void> {
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

  encriptarRSA(mensaje: bigint): bigint {
    const mensajeCifrado: bigint = bcu.modPow(mensaje, this.keyRSAe, this.keyRSAn)
    return bigintConversion.bigintToHex(mensajeCifrado)
  }

  cegarRSA(mensaje: bigint): bigint {
    let r: Uint8Array = window.crypto.getRandomValues(new Uint8Array(16));
    this.rBigint = bigintConversion.bufToBigint(r);
    let enc: Boolean = false;
    while (!enc){
      if (this.rBigint % this.keyRSAn !== 0n)
        enc = true;

      else{
        r = window.crypto.getRandomValues(new Uint8Array(16));
        this.rBigint = bigintConversion.bufToBigint(r);
      }
    }

    const rCifrado: bigint = bcu.modPow(this.rBigint, this.keyRSAe, this.keyRSAn)
    return bigintConversion.bigintToHex(bcu.toZn(mensaje*rCifrado, this.keyRSAn))
  }

  descegarRSA(cifrado: bigint): bigint {
    const rinverso: bigint = bcu.modInv(this.rBigint, this.keyRSAn);
    return bcu.toZn(cifrado*rinverso, this.keyRSAn)
  }

  verificarRSA(cifrado: bigint): bigint {
    return bcu.modPow(cifrado, this.keyRSAe, this.keyRSAn)
  }

  async encriptarAES(mensaje: Uint8Array): Promise<DatoscifradoAES> {
    const iv: Uint8Array = window.crypto.getRandomValues(new Uint8Array(12))
    const mensajeCifrado: ArrayBuffer = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
    }, 
    this.keyAES, 
    mensaje
    )

    const mensajeCifradoHex: string = bigintConversion.bufToHex(mensajeCifrado)
    return {
      mensaje: mensajeCifradoHex.slice(0, mensajeCifradoHex.length - 32),
      iv: bigintConversion.bufToHex(iv),
      tag: mensajeCifradoHex.slice(mensajeCifradoHex.length - 32, mensajeCifradoHex.length)
    }
  }
}
