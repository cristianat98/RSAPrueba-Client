import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PruebaService {

  constructor(private http: HttpClient) { }

  getMensaje(mensaje: any): Observable<any>{
    return this.http.post<any>(environment.apiURL + "/mensaje", mensaje);
  }
}
