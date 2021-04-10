import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import * as bigintConversion from 'bigint-conversion';
import * as bcu from 'bigint-crypto-utils';
import { Mensaje } from '../modelos/mensaje';
import { MensajeCifrado } from '../modelos/mensaje-cifrado';

@Injectable({
  providedIn: 'root'
})
export class PruebaService {

  keyAES: CryptoKey;
  keyRSAe: bigint;
  keyRSAn: bigint;
  constructor(private http: HttpClient) { }

  getMensaje(mensaje: Mensaje): Promise<Mensaje> {
    const mensajeBigint: bigint = bigintConversion.textToBigint(mensaje.mensaje);
    const mensajeCifrado: bigint = bcu.modPow(mensajeBigint, this.keyRSAe, this.keyRSAn)
    mensaje.mensaje = bigintConversion.bigintToHex(mensajeCifrado)
    return new Promise((resolve, reject) => {
      this.http.post<MensajeCifrado>(environment.apiURL + "/mensaje", mensaje).subscribe(async data => {
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
}
