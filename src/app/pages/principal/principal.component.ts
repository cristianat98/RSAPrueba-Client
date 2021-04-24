import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { CifradoRSA, UsuarioServidor, Mensaje, MensajeServidor, CifradoAES, NoRepudio } from '../../modelos/modelos';
import { Usuario } from '../../modelos/modelos';
import * as bigintConversion from 'bigint-conversion';
import * as cryptojs from 'crypto-js';
import { RsaPublicKey } from '../../modelos/clave-rsa';
import { ServidorService } from 'src/app/services/servidor.service';

@Component({
  selector: 'app-principal',
  templateUrl: './principal.component.html',
  styleUrls: ['./principal.component.css']
})
export class PrincipalComponent implements OnInit {

  constructor(private servidorService: ServidorService, private changeDetectorRef: ChangeDetectorRef, private socket: Socket) { }

  mensaje: string;
  mensajeAlgoritmo: string;
  usuarioTextBox: string;
  usuario: string;
  usuarioNoRepudio: string;
  ivNoRepudio: Uint8Array;
  usuarios: Usuario[] = [];
  cifrado: string;
  errorCifrado: Boolean = false;
  errorMensaje: Boolean = false;
  errorMensajeAlgoritmo: Boolean = false;
  errorNombre: Boolean = false;
  errorElegido: Boolean = false;
  errorUsuario: Boolean = false;
  enviado: Boolean = false;
  recibido: Boolean = false;
  contestado: Boolean = false;
  noContestado: Boolean = false;
  mensajeRecibido: Mensaje;
  mensajes: Mensaje[] = [];

  ngOnInit(): void {
    this.servidorService.getClaves();
  }

  sockets(): void {
    this.socket.on('nuevoConectado', (usuarioSocket: UsuarioServidor) => {
      if (usuarioSocket.nombre !== this.usuario){
        const nuevoUsuario: Usuario = {
          nombre: usuarioSocket.nombre,
          publicKey: new RsaPublicKey(bigintConversion.hexToBigint(usuarioSocket.eHex), bigintConversion.hexToBigint(usuarioSocket.nHex))
        }
        this.usuarios.push(nuevoUsuario)
      }
    })

    this.socket.on('cambiarNombre', (usuariosSocket: string[]) => {
      if (this.usuario !== usuariosSocket[1]){
        this.usuarios.forEach((usuarioLista: Usuario) => {
          if (usuarioLista.nombre === usuariosSocket[0]){
            this.usuarios[this.usuarios.indexOf(usuarioLista)].nombre = usuariosSocket[1];
          }
        })
      }
    })

    this.socket.on('desconectado', (usuarioSocket: string) => {
      this.usuarios.forEach((usuarioLista: Usuario) => {
        if (usuarioLista.nombre === usuarioSocket)
          this.usuarios.splice(this.usuarios.indexOf(usuarioLista), 1)
      })
    })

    this.socket.on('nuevoMensaje', (mensajeSocket: Mensaje) => {
      if (mensajeSocket.usuario !== this.usuario){
        this.mensajes.push(mensajeSocket)
      }
    })

    this.socket.on('mensajeCifrado', (recibido: NoRepudio) => {
      this.usuarios.forEach(usuarioLista => {
        if (usuarioLista.nombre === recibido.usuarioOrigen){
          const hashFirmaBigint: bigint = usuarioLista.publicKey.verify(bigintConversion.hexToBigint(recibido.firma));
          const hashFirma: string = bigintConversion.bigintToText(hashFirmaBigint);
          const hash: string = cryptojs.SHA256(bigintConversion.hexToBuf(recibido.cifrado)).toString(); 
          if (hashFirma === hash)
            this.recibido = true;
        }
      })
    })

    this.socket.on('noContestado', () => {
      this.recibido = false;
    })
  }

  setUsuario(): void {
    if (this.usuarioTextBox === undefined || this.usuarioTextBox === ""){
      this.errorNombre = true;
      return
    }
    
    else{
      this.errorNombre = false;

      if (this.usuario === undefined){
        this.servidorService.conectar(this.usuarioTextBox).subscribe(data => {
          this.errorElegido = false;
          data.forEach((usuarioLista: UsuarioServidor)  => {
            const nuevoUsuario: Usuario = {
              nombre: usuarioLista.nombre,
              publicKey: new RsaPublicKey (bigintConversion.hexToBigint(usuarioLista.eHex), bigintConversion.hexToBigint(usuarioLista.nHex))
            }
            this.usuarios.push(nuevoUsuario)
          })
          this.usuario = this.usuarioTextBox;
          this.sockets();
          const usuarioEnviar: UsuarioServidor = {
            nombre: this.usuario,
            nHex: bigintConversion.bigintToHex(this.servidorService.getkeyRSAPublica().n),
            eHex: bigintConversion.bigintToHex(this.servidorService.getkeyRSAPublica().e)
          }

          this.socket.emit('nuevoConectado', usuarioEnviar);
        }, () => {
          this.errorElegido = true;
          this.usuarioTextBox = "";
        })
      }
  
      else{
        const cambioUsuario: string[] = [this.usuario, this.usuarioTextBox];
        this.servidorService.cambiar(cambioUsuario).subscribe(() => {
          this.usuario = this.usuarioTextBox;
          this.socket.emit('cambiarNombre', cambioUsuario);
        }, () => {
          this.errorElegido = true;
          this.usuarioTextBox = this.usuario;
        })
      }
    }
  }

  async enviar(): Promise<void>{
    if (this.cifrado === undefined){
      this.errorCifrado = true;
      this.errorNombre = false;
      return
    }

    if (this.mensaje === undefined || this.mensaje === ""){
      this.errorMensaje = true;
      this.errorNombre = false;

      if (this.cifrado !== undefined)
        this.errorCifrado = false;
      return
    }

    this.errorCifrado = false;
    this.errorMensaje = false;
    this.errorElegido = false;
    this.errorNombre = false;
    this.mensajes.push({
      usuario: "Server",
      mensaje: "Enviando..."
    })

    if (this.cifrado === "Firma Ciega"){
      const hashmensaje: string = cryptojs.SHA256(this.mensaje).toString();
      const hashCegadoBigint: bigint = await this.servidorService.cegarRSA(bigintConversion.textToBigint(hashmensaje));
      const hashCegado: string = bigintConversion.bigintToHex(hashCegadoBigint);
      const enviar: Mensaje = {
        usuario: this.usuario,
        mensaje: hashCegado
      }

      this.servidorService.firmarServidor(enviar).subscribe(data => {
        const firma: bigint = this.servidorService.descegarRSA(bigintConversion.hexToBigint(data.mensaje));
        const digestBigint: bigint = this.servidorService.verificarRSA(firma);
        const digest: string = bigintConversion.bigintToText(digestBigint);
        if (digest === hashmensaje){
          const mensaje: Mensaje = {
            usuario: this.usuario,
            mensaje: this.mensaje + "(VERIFICADO)"
          }

          this.mensajes[this.mensajes.length - 1] = mensaje
          this.mensaje = "";
          this.changeDetectorRef.detectChanges();
        }
      })
    }

    else{
      let enviar: MensajeServidor;
      if (this.cifrado === "RSA"){
        const cifrado: CifradoRSA = await this.servidorService.cifrarRSA(new Uint8Array(bigintConversion.textToBuf(this.mensaje)));
        enviar = {
          usuario: this.usuario,
          tipo: "RSA",
          cifrado: bigintConversion.bufToHex(cifrado.cifrado.mensaje),
          iv: bigintConversion.bufToHex(cifrado.cifrado.iv),
          clave: cifrado.clave
        }
      }

      else if (this.cifrado === "AES"){
        const cifrado: CifradoAES = await this.servidorService.cifrarAES(new Uint8Array(bigintConversion.textToBuf(this.mensaje)));
        enviar = {
          usuario: this.usuario,
          tipo: "AES",
          cifrado: bigintConversion.bufToHex(cifrado.mensaje),
          iv: bigintConversion.bufToHex(cifrado.iv)
        }
      }
      
      this.servidorService.enviarCifrado(enviar).subscribe(async data => {
        const cifradoAES: CifradoAES = {
          mensaje: new Uint8Array(bigintConversion.hexToBuf(data.cifrado)),
          iv: new Uint8Array(bigintConversion.hexToBuf(data.iv))
        }

        const mensaje: Uint8Array = await this.servidorService.descifrarAES(cifradoAES);
        const mensajeRecibido: Mensaje = {
          usuario: data.usuario,
          mensaje: bigintConversion.bufToText(mensaje)
        }

        this.mensajes[this.mensajes.length - 1] = mensajeRecibido
        this.mensaje = "";
        this.changeDetectorRef.detectChanges();
      })
    }
  }

  async enviarNoRepudio(): Promise<void> {
    if (this.usuarioNoRepudio === undefined){
      this.errorUsuario = true;
      this.errorNombre = false;
      return
    }

    if (this.mensajeAlgoritmo === undefined || this.mensajeAlgoritmo === ""){
      this.errorNombre = false;
      this.errorMensajeAlgoritmo = true;

      if (this.usuarioNoRepudio !== undefined)
        this.errorUsuario = false;
      return
    }

    this.errorUsuario = false;
    this.errorMensajeAlgoritmo = false;
    this.enviado = true;
    this.errorNombre = false;
    const mensajeCifrado: CifradoAES = await this.servidorService.cifrarAES(new Uint8Array(bigintConversion.textToBuf(this.mensajeAlgoritmo)));
    const hashCifrado: string = cryptojs.SHA256(mensajeCifrado.mensaje).toString();
    const firma: bigint = this.servidorService.firmarRSA(bigintConversion.textToBigint(hashCifrado));
    this.ivNoRepudio = mensajeCifrado.iv;

    const enviar: NoRepudio = {
      usuarioOrigen: this.usuario,
      usuarioDestino: this.usuarioNoRepudio,
      cifrado: bigintConversion.bufToHex(mensajeCifrado.mensaje),
      firma: bigintConversion.bigintToHex(firma)
    }

    this.socket.emit('mensajeCifrado', enviar);

    setInterval(() => {
      if (this.enviado === true){
        this.enviado = false;
        this.noContestado = true;
        this.socket.emit('noContestar', this.usuarioNoRepudio);
      }
    }, 5000)
  }

  aceptar(): void {
    this.noContestado = false;
  }

  contestar(): void {
    this.recibido = false;
    const contestar: string = "OK";
    const hash: string = cryptojs.SHA256(contestar).toString();
    const firma: bigint = this.servidorService.firmarRSA(bigintConversion.textToBigint(hash));
    const enviar: Mensaje = {
      usuario: this.usuario,
      mensaje: bigintConversion.bigintToHex(firma)
    }

    this.socket.emit('contestar', enviar);
  }

  rechazar(): void {
    this.recibido = false;
  }
}