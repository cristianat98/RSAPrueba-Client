import { Component, OnInit } from '@angular/core';
import { PruebaService } from 'src/app/services/prueba.service';

@Component({
  selector: 'app-principal',
  templateUrl: './principal.component.html',
  styleUrls: ['./principal.component.css']
})
export class PrincipalComponent implements OnInit {

  constructor(private pruebaService: PruebaService) { }

  mensaje: String;
  usuario: String;
  mensajes: any[] = [];
  ngOnInit(): void {
  }

  enviar(): void{
    const mensaje = {
      usuario: this.usuario,
      mensaje: this.mensaje
    }
    this.pruebaService.getMensaje(mensaje).subscribe(data => {
      this.mensajes.push(data);
    }, error => {
      console.log("ERROR!!")
    })
  }
}
