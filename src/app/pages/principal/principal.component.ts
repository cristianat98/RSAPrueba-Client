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

  async enviar(): Promise<void>{
    const mensaje = {
      usuario: this.usuario,
      mensaje: bigintConversion.textToBigint(this.mensaje)
    }
    this.mensajes.push({
      "usuario": "Server",
      "mensaje": "Enviando..."
    })
    const mensajeAes = await this.pruebaService.getMensaje(mensaje)
    this.mensajes[this.mensajes.length - 1].mensaje = bigintConversion.bufToText(mensajeAes)
    this.mensajes[this.mensajes.length - 1].usuario = this.usuario
  }
}
