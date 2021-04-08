import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import * as bigintConversion from 'bigint-conversion'
import * as bcu from 'bigint-crypto-utils'

@Injectable({
  providedIn: 'root'
})
export class PruebaService {

  keyAES;
  keyRSAe: bigint;
  keyRSAn: bigint;
  constructor(private http: HttpClient) { }

  getMensaje(mensaje: any){
    mensaje.mensaje = bcu.modPow(mensaje.mensaje, this.keyRSAe, this.keyRSAn)
    mensaje.mensaje = bigintConversion.bigintToHex(mensaje.mensaje)
    this.http.post<any>(environment.apiURL + "/mensaje", mensaje).subscribe(async data => {
      /*return */ const mensaje = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: new Uint8Array(data.iv)
        },
        this.keyAES,
        bigintConversion.hexToBuf(data.mensaje)
      )
    });
  }

  async getClaves() {
    const keyAESHex = "95442fa551e13eacedea3e79f0ec1e63513cc14a9dbc4939ad70ceb714b44b8f";
    this.keyAES = new Uint8Array(bigintConversion.hexToBuf(keyAESHex));
    this.keyAES = await crypto.subtle.importKey(
      "raw",
      this.keyAES,
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
