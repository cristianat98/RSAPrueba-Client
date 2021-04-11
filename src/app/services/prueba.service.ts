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

  constructor(private http: HttpClient) { }

  async getMensaje(mensaje: Mensaje, cifrado: string): Promise<Mensaje> {
    let enviar;
    if (cifrado === "RSA"){
      const mensajeCifrado: string = this.encriptarRSA(mensaje.mensaje);
      enviar = {
        cifrado: "RSA",
        usuario: mensaje.usuario,
        mensaje: mensajeCifrado
      }
    }

    else{
      const datosAES: DatoscifradoAES = await this.encriptarAES(mensaje.mensaje);
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
    const datosAES: DatoscifradoAES = await this.encriptarAES(mensaje.mensaje);
    this.ivFirma = datosAES.iv;
    const enviar = {
      usuario: mensaje.usuario,
      mensaje: datosAES.mensaje + datosAES.tag
    }

    return new Promise((resolve, reject) => {
      this.http.post<MensajeRecibidoCifrado>(environment.apiURL + "/firma", enviar).subscribe(async data => {
        const mensajeVerificado = this.verificarRSA(data.mensaje);
        
        try {
          const decrypted: ArrayBuffer = await crypto.subtle.decrypt(
            {
              name: "AES-GCM",
              iv: new Uint8Array(bigintConversion.hexToBuf(this.ivFirma))
            },
            this.keyAES,
            new Uint8Array(bigintConversion.hexToBuf(mensajeVerificado))
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

  verificarRSA(cifrado: string): string {
    const cifradoBigint: bigint = bigintConversion.textToBigint(cifrado);
    const mensajeVerificadoBigint: bigint = bcu.modPow(cifradoBigint, this.keyRSAe, this.keyRSAn)
    return bigintConversion.bigintToHex(mensajeVerificadoBigint)
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
