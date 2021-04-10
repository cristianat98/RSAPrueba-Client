import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
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
  mensajes: Mensaje[] = [];
  
  ngOnInit(): void {
    this.pruebaService.getClaves();
  }

  async enviar(): Promise<void>{
    const mensaje: Mensaje = {
      usuario: this.usuario,
      mensaje: this.mensaje
    }
    this.mensajes.push({
      usuario: "Server",
      mensaje: "Enviando..."
    })
    const mensajeAes: Mensaje = await this.pruebaService.getMensaje(mensaje);
    this.mensajes[this.mensajes.length - 1] = mensajeAes;
    this.usuario = "";
    this.mensaje = "";
    this.changeDetectorRef.detectChanges();
  }
}
