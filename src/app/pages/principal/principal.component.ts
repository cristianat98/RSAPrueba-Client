import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { DatoscifradoAES } from 'src/app/modelos/datoscifrado-aes';
import { PruebaService } from 'src/app/services/prueba.service';
import { Mensaje } from '../../modelos/mensaje';

@Component({
  selector: 'app-principal',
  templateUrl: './principal.component.html',
  styleUrls: ['./principal.component.css']
})
export class PrincipalComponent implements OnInit {

  constructor(private pruebaService: PruebaService, private  ngZone: NgZone, private changeDetectorRef: ChangeDetectorRef) { }

  mensaje: string;
  usuario: string;
  cifrado: string;
  error: Boolean = false;
  error2: Boolean = false;
  mensajeRecibido: Mensaje;
  mensajes: Mensaje[] = [];
  
  ngOnInit(): void {
    this.pruebaService.getClaves();
  }

  async enviar(): Promise<void>{
    if (this.cifrado === undefined){
      this.error = true;
      return
    }
    if (this.usuario === undefined || this.mensaje === undefined){
      this.error2 = true;
      if (this.cifrado !== undefined)
        this.error = false;
      return
    }

    this.error = false;
    this.error2 = false;
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
    this.usuario = "";
    this.mensaje = "";
    this.changeDetectorRef.detectChanges();
  }
}
