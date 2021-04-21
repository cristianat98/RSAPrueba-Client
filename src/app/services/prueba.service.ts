import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import * as bigintConversion from 'bigint-conversion';
import * as bcu from 'bigint-crypto-utils';
import { Mensaje } from '../modelos/mensaje';
import { MensajeRecibidoCifrado } from '../modelos/mensaje-cifrado';
import { DatosCifradoAES } from '../modelos/datoscifrado-aes';
import { KeyPublicaRSA } from 'src/app/modelos/key-publica-rsa'

@Injectable({
  providedIn: 'root'
})
export class PruebaService {

  keyAES: CryptoKey;
  keyPublicaRSA: KeyPublicaRSA;
  rCegar: bigint;

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
      const datosAES: DatosCifradoAES = await this.encriptarAES(new Uint8Array (bigintConversion.textToBuf(mensaje.mensaje)));
      enviar = {
        cifrado: "AES",
        usuario: mensaje.usuario,
        mensaje: datosAES.mensaje,
        iv: datosAES.iv
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
    const keyAESHex = "95442fa551e13eacedea3e79f0ec1e63513cc14a9dbc4939ad70ceb714b44b8f"
    const keyAESBuffer: ArrayBuffer = new Uint8Array(bigintConversion.hexToBuf(keyAESHex));
    this.keyAES = await crypto.subtle.importKey(
      "raw",
      keyAESBuffer,
      "AES-GCM",
      true,
      ["encrypt", "decrypt"]
    )
    this.http.get<KeyPublicaRSA>(environment.apiURL + "/rsa").subscribe(data => {
      this.keyPublicaRSA = data;
      this.keyPublicaRSA.e = bigintConversion.hexToBigint(this.keyPublicaRSA.eHex);
      this.keyPublicaRSA.n = bigintConversion.hexToBigint(this.keyPublicaRSA.nHex);
    });
  }

  encriptarRSA(mensaje: bigint): bigint {
    const mensajeCifrado: bigint = bcu.modPow(mensaje, this.keyPublicaRSA.e, this.keyPublicaRSA.n)
    return bigintConversion.bigintToHex(mensajeCifrado)
  }

  verificarRSA(cifrado: bigint): bigint {
    return bcu.modPow(cifrado, this.keyPublicaRSA.e, this.keyPublicaRSA.n)
  }

  cegarRSA(mensaje: bigint): bigint {
    this.rCegar = bigintConversion.bufToBigint(window.crypto.getRandomValues(new Uint8Array(16)));
    let enc: Boolean = false;
    while (!enc){
      if (this.rCegar % this.keyPublicaRSA.n !== 0n)
        enc = true;

      else
        this.rCegar = bigintConversion.bufToBigint(window.crypto.getRandomValues(new Uint8Array(16)));
    }

    const rCifrado: bigint = bcu.modPow(this.rCegar, this.keyPublicaRSA.e, this.keyPublicaRSA.n)
    return bigintConversion.bigintToHex(bcu.toZn(mensaje*rCifrado, this.keyPublicaRSA.n))
  }

  descegarRSA(cifrado: bigint): bigint {
    const rinverso: bigint = bcu.modInv(this.rCegar, this.keyPublicaRSA.n);
    return bcu.toZn(cifrado*rinverso, this.keyPublicaRSA.n)
  }

  async encriptarAES(mensaje: Uint8Array): Promise<DatosCifradoAES> {
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
      mensaje: mensajeCifradoHex,
      iv: bigintConversion.bufToHex(iv)
    }
  }
}
