import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import * as bigintConversion from 'bigint-conversion';
import * as bcu from 'bigint-crypto-utils';
import { Mensaje } from '../modelos/mensaje';
import { MensajeRecibidoCifrado } from '../modelos/mensaje-cifrado';
import { DatosCifradoAES } from '../modelos/datoscifrado-aes';
import { KeyPublicaRSA } from 'src/app/modelos/key-publica-rsa'
import { Observable } from 'rxjs';
import { Usuario } from '../modelos/usuario';
import { generateKeys, rsaKeyPair, RsaPublicKey } from '../modelos/clave-rsa';

@Injectable({
  providedIn: 'root'
})
export class PruebaService {

  keyAES: CryptoKey;
  keyPublicaServidorRSA: KeyPublicaRSA;
  rCegar: bigint;
  rsaKeyPair: rsaKeyPair;

  constructor(private http: HttpClient) { }

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
    this.rsaKeyPair = await generateKeys(2048);
    this.http.get<KeyPublicaRSA>(environment.apiURL + "/rsa").subscribe(data => {
      this.keyPublicaServidorRSA = data;
      this.keyPublicaServidorRSA.e = bigintConversion.hexToBigint(this.keyPublicaServidorRSA.eHex);
      this.keyPublicaServidorRSA.n = bigintConversion.hexToBigint(this.keyPublicaServidorRSA.nHex);
    });
  }

  getPublicKey(): RsaPublicKey {
    return this.rsaKeyPair.publicKey;
  }

  conectar(usuario: string): Observable<Usuario[]> {
    const enviar = {
      usuario: usuario
    }

    return this.http.post<Usuario[]>(environment.apiURL + "/conectar", enviar)
  }

  cambiar(usuarios: string[]): Observable<string> {
    const enviar = {
      usuarioAntiguo: usuarios[0],
      usuarioNuevo: usuarios[1]
    }

    return this.http.post<string>(environment.apiURL + "/cambiar", enviar)
  }

  async getMensaje(mensaje: Mensaje, cifrado: string): Promise<Mensaje> {
    let enviar;
    if (cifrado === "RSA"){
      const keyTemporal: CryptoKey = await crypto.subtle.generateKey(
        {
          name: "AES-GCM",
          length: 256
        },
        true,
        ["encrypt", "decrypt"]
      );
      const iv: Uint8Array = window.crypto.getRandomValues(new Uint8Array(12));
      const mensajeArray: Uint8Array = new Uint8Array(bigintConversion.textToBuf(mensaje.mensaje));
      const mensajeCifrado: ArrayBuffer = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv
      }, 
      keyTemporal, 
      mensajeArray
      )
      const claveArray = await window.crypto.subtle.exportKey("raw", keyTemporal);
      const claveCifrada: bigint = this.encriptarRSA(bigintConversion.bufToBigint(claveArray));
      enviar = {
        cifrado: "RSA",
        usuario: mensaje.usuario,
        iv: bigintConversion.bufToHex(iv),
        clave: bigintConversion.bigintToHex(claveCifrada),
        mensaje: bigintConversion.bufToHex(mensajeCifrado)
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

  encriptarRSA(mensaje: bigint): bigint {
    const mensajeCifrado: bigint = bcu.modPow(mensaje, this.keyPublicaServidorRSA.e, this.keyPublicaServidorRSA.n)
    return bigintConversion.bigintToHex(mensajeCifrado)
  }

  verificarRSA(cifrado: bigint): bigint {
    return bcu.modPow(cifrado, this.keyPublicaServidorRSA.e, this.keyPublicaServidorRSA.n)
  }

  cegarRSA(mensaje: bigint): bigint {
    this.rCegar = bigintConversion.bufToBigint(window.crypto.getRandomValues(new Uint8Array(16)));
    let enc: Boolean = false;
    while (!enc){
      if (this.rCegar % this.keyPublicaServidorRSA.n !== 0n)
        enc = true;

      else
        this.rCegar = bigintConversion.bufToBigint(window.crypto.getRandomValues(new Uint8Array(16)));
    }

    const rCifrado: bigint = bcu.modPow(this.rCegar, this.keyPublicaServidorRSA.e, this.keyPublicaServidorRSA.n)
    return bigintConversion.bigintToHex(bcu.toZn(mensaje*rCifrado, this.keyPublicaServidorRSA.n))
  }

  descegarRSA(cifrado: bigint): bigint {
    const rinverso: bigint = bcu.modInv(this.rCegar, this.keyPublicaServidorRSA.n);
    return bcu.toZn(cifrado*rinverso, this.keyPublicaServidorRSA.n)
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
