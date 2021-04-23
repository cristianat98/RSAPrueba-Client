import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import * as bigintConversion from 'bigint-conversion';
import * as bcu from 'bigint-crypto-utils';
import { enviarUsuario, Mensaje } from '../modelos/modelos';
import { MensajeRecibidoCifrado } from '../modelos/modelos';
import { DatosCifradoAES } from '../modelos/modelos';
import { Observable } from 'rxjs';
import { Usuario } from '../modelos/modelos';
import { generateKeys, rsaKeyPair, RsaPublicKey, RsaPrivateKey } from '../modelos/clave-rsa';
import { keyAES } from '../modelos/modelos-aes';

@Injectable({
  providedIn: 'root'
})
export class ServidorService {

  constructor(private http: HttpClient) { }

  keyAESServidor: keyAES;
  keyRSA: rsaKeyPair;
  keyRSAPublicaServidor: RsaPublicKey;
  keyTemporalAES: keyAES;

  async getClaves(): Promise<void> {
    const keyAESHex: string = "95442fa551e13eacedea3e79f0ec1e63513cc14a9dbc4939ad70ceb714b44b8f"
    this.keyAESServidor = new keyAES();
    this.keyAESServidor.setup(new Uint8Array(bigintConversion.hexToBuf(keyAESHex)));
    this.keyRSA = await generateKeys(2048);
    this.http.get<enviarUsuario>(environment.apiURL + "/rsa").subscribe(data => {
      this.keyRSAPublicaServidor = new RsaPublicKey(bigintConversion.hexToBigint(data.eHex), bigintConversion.hexToBigint(data.nHex));
    });
  }

  getkeyRSAPublica(): RsaPublicKey {
    return this.keyRSA.publicKey;
  }
  
  conectar(usuario: string): Observable<enviarUsuario[]> {
    const enviar: enviarUsuario = {
      nombre: usuario,
      eHex: bigintConversion.bigintToHex(this.keyRSA.publicKey.e),
      nHex: bigintConversion.bigintToHex(this.keyRSA.publicKey.n)
    }

    return this.http.post<enviarUsuario[]>(environment.apiURL + "/conectar", enviar)
  }

  cambiar(usuarios: string[]): Observable<string> {
    const enviar = {
      usuarioAntiguo: usuarios[0],
      usuarioNuevo: usuarios[1]
    }

    return this.http.post<string>(environment.apiURL + "/cambiar", enviar)
  }
}
