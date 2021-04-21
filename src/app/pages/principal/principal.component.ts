import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { PruebaService } from 'src/app/services/prueba.service';
import { Mensaje } from '../../modelos/mensaje';
import { Usuario } from '../../modelos/usuario';
import * as bigintConversion from 'bigint-conversion';

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
  mensajeRecibido: Mensaje;
  mensajes: Mensaje[] = [];

  ngOnInit(): void {
    this.pruebaService.getClaves();
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
            eHex: bigintConversion.bigintToHex(this.pruebaService.getPublicKey().e),
            nHex: bigintConversion.bigintToHex(this.pruebaService.getPublicKey().n)
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

    this.socket.on('nuevoConectado', (usuarioSocket: Usuario) => {
      if (usuarioSocket.nombre !== this.usuario)
        this.usuarios.push(usuarioSocket)
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
    this.socket.emit('nuevoMensaje', this.mensajeRecibido);
    this.socket.on('nuevoMensaje', (mensajeSocket: Mensaje) => {
      if (mensajeSocket.usuario !== this.usuario){
        this.mensajes.push(mensajeSocket)
      }
    })
  }

  enviar2(): void {
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

    const enviar = {
      usuario: this.usuario,
      mensaje: this.mensajeAlgoritmo
    }

    const enviarCifrado = this.pruebaService.encriptarAES(new Uint8Array(bigintConversion.textToBuf(enviar.toString())));
  }
}
