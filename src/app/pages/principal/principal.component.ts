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

  ngOnInit(): void {
  }

  enviar(): void{
    this.pruebaService.getMensaje(this.mensaje).subscribe(data => {
      console.log("ENVIADO!!");
      console.log("DATA", data);
    })
  }
}
