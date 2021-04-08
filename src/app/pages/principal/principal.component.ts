import { Component, OnInit } from '@angular/core';
import { PruebaService } from 'src/app/services/prueba.service';
import * as bigintConversion from 'bigint-conversion';

@Component({
  selector: 'app-principal',
  templateUrl: './principal.component.html',
  styleUrls: ['./principal.component.css']
})
export class PrincipalComponent implements OnInit {

  constructor(private pruebaService: PruebaService) { }

  mensaje: string;
  usuario: string;
  mensajes: any[] = [];

  ngOnInit(): void {
    this.pruebaService.getClaves();
  }

  enviar(): void{
    const mensaje = {
      usuario: this.usuario,
      mensaje: bigintConversion.textToBigint(this.mensaje)
    }
    this.mensajes.push({
      "usuario": "Server",
      "mensaje": "Enviando..."
    })
    this.pruebaService.getMensaje(mensaje);
    /*this.pruebaService.getMensaje(mensaje).subscribe(data => {
      this.mensajes[this.mensajes.length - 1] = data;
    }, () => {
      this.mensajes[this.mensajes.length - 1].mensaje = "NO SE HA PODIDO ENVIAR";
    })*/
  }
}
