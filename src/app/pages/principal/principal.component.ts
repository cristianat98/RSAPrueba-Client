import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { PruebaService } from 'src/app/services/prueba.service';
import { Mensaje } from '../../modelos/modelos';
import { Usuario } from '../../modelos/modelos';
import * as bigintConversion from 'bigint-conversion';
import { DatosCifradoAES } from 'src/app/modelos/modelos';
import * as cryptojs from 'crypto-js';
import { RsaPublicKey } from '../../modelos/clave-rsa';

@Component({
  selector: 'app-principal',
  templateUrl: './principal.component.html',
  styleUrls: ['./principal.component.css']
})
export class PrincipalComponent implements OnInit {

  constructor(private pruebaService: PruebaService, private  ngZone: NgZone, private changeDetectorRef: ChangeDetectorRef, private socket: Socket) { }

  mensaje: string;
  mensajeAlgoritmo: string;
  usuarioTextBox: string;
  usuario: string;
  usuarioNoRepudio: string;
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
  mensajeRecibido: Mensaje;
  mensajes: Mensaje[] = [];

  ngOnInit(): void {
    this.pruebaService.getClaves();

    this.socket.on('nuevoConectado', (usuarioSocket: Usuario) => {
      if (usuarioSocket.nombre !== this.usuario)
        this.usuarios.push(usuarioSocket)
    })

    this.socket.on('mensajeCifrado', recibido => {
      this.usuarios.forEach(usuarioLista => {
        if (usuarioLista.nombre === recibido.usuarioOrigen){
          const hashFirma: string = bigintConversion.bigintToText(usuarioLista.publicKey.verify(recibido.firma));
          console.log(hashFirma);
          const hash: string = cryptojs.SHA256(recibido.mensaje).toString(); 
          console.log(hash);
          if (hashFirma === hash)
            this.recibido = true;
        }
      })
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
  }

  setUsuario(): void {
    if (this.usuarioTextBox === undefined || this.usuarioTextBox === ""){
      this.errorNombre = true;
      return
    }
    
    else{
      this.errorNombre = false;
      if (this.usuario === undefined){
        this.pruebaService.conectar(this.usuarioTextBox).subscribe(data => {
          this.errorElegido = false;
          this.usuarios = data;
          this.usuario = this.usuarioTextBox;
          this.socket.connect();
          const usuarioEnviar: Usuario = {
            nombre: this.usuario,
            publicKey: this.pruebaService.getPublicKey()
          }

          this.socket.emit('nuevoConectado', usuarioEnviar);
        }, () => {
          this.errorElegido = true;
          this.usuarioTextBox = "";
        })
      }
  
      else{
        const usuarios: string [] = [this.usuario, this.usuarioTextBox];
        this.pruebaService.cambiar(usuarios).subscribe(() => {
          this.usuario = this.usuarioTextBox;
          this.socket.emit('cambiarNombre', usuarios);
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
      return
    }

    if (this.mensaje === undefined || this.mensaje === ""){
      this.errorMensaje = true;
      if (this.cifrado !== undefined)
        this.errorCifrado = false;
      return
    }

    this.errorCifrado = false;
    this.errorMensaje = false;
    this.errorElegido = false;
    let mensaje: Mensaje = {
      usuario: this.usuario,
      mensaje: this.mensaje
    }

    this.mensajes.push({
      usuario: "Server",
      mensaje: "Enviando..."
    })

    if (this.cifrado === "RSA" || this.cifrado === "AES")
      this.mensajeRecibido = await this.pruebaService.getMensaje(mensaje, this.cifrado)

    else
      this.mensajeRecibido = await this.pruebaService.getFirma(mensaje)

    this.mensajes[this.mensajes.length - 1] = this.mensajeRecibido
    this.mensaje = "";
    this.changeDetectorRef.detectChanges();
    //this.socket.emit('nuevoMensaje', this.mensajeRecibido);
    this.socket.on('nuevoMensaje', (mensajeSocket: Mensaje) => {
      if (mensajeSocket.usuario !== this.usuario){
        this.mensajes.push(mensajeSocket)
      }
    })
  }

  async enviar2(): Promise<void> {
    console.log(this.usuarioNoRepudio)
    if (this.usuarioNoRepudio === undefined){
      this.errorUsuario = true;
      return
    }

    if (this.mensajeAlgoritmo === undefined || this.mensajeAlgoritmo === ""){
      this.errorMensajeAlgoritmo = true;
      if (this.usuarioNoRepudio !== undefined)
        this.errorUsuario = false;
      return
    }

    this.errorUsuario = false;
    this.errorMensajeAlgoritmo = false;
    this.enviado = true;
    const mensajeCifrado: DatosCifradoAES = await this.pruebaService.encriptarAES(new Uint8Array(bigintConversion.textToBuf(this.mensajeAlgoritmo)));
    const hashCifrado = cryptojs.SHA256(mensajeCifrado.mensaje.toString())
    const firma: bigint = this.pruebaService.getPrivateKey().sign(bigintConversion.textToBigint(hashCifrado.toString()))
    const enviar = {
      usuarioOrigen: this.usuario,
      usuarioDestino: this.usuarioNoRepudio,
      mensaje: mensajeCifrado,
      firma: bigintConversion.bigintToHex(firma)
    }
    this.socket.emit('mensajeCifrado', enviar);
  }

  contestar(): void {

  }

  rechazar(): void {
    this.recibido = false;
  }
}
