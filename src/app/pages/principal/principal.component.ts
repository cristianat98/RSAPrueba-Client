import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { PruebaService } from 'src/app/services/prueba.service';
import { Mensaje } from '../../modelos/mensaje';

@Component({
  selector: 'app-principal',
  templateUrl: './principal.component.html',
  styleUrls: ['./principal.component.css']
})
export class PrincipalComponent implements OnInit {

  constructor(private pruebaService: PruebaService, private  ngZone: NgZone, private changeDetectorRef: ChangeDetectorRef, private socket: Socket) { }

  mensaje: string;
  usuarioTextBox: string;
  usuario: string;
  usuarioNoRepudio: string;
  usuarios: string[] = [];
  cifrado: string;
  errorCifrado: Boolean = false;
  errorMensaje: Boolean = false;
  errorNombre: Boolean = false;
  errorElegido: Boolean = false;
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
          this.socket.emit('nuevoConectado', this.usuario);
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

    this.socket.on('nuevoConectado', (usuarioSocket: string) => {
      if (usuarioSocket !== this.usuario)
        this.usuarios.push(usuarioSocket)
    })

    this.socket.on('cambiarNombre', (usuariosSocket: string[]) => {
      if (this.usuario !== usuariosSocket[1]){
        this.usuarios.forEach((usuarioLista: string) => {
          if (usuarioLista === usuariosSocket[0]){
            this.usuarios[this.usuarios.indexOf(usuarioLista)] = usuariosSocket[1];
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

    if (this.usuario === undefined || this.usuario === "" || this.mensaje === undefined || this.mensaje === ""){
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
}
