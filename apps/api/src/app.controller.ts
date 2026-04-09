import { Controller, Get } from "@nestjs/common";   //Uygulamanın sağlık kontrolü gibi temel işlevlerini sağlayan AppController'ı tanımlar

@Controller("health")     //health yolunu dinleyen bir denetleyici oluşturur
export class AppController {  //Sağlık kontrolü için bir GET isteği tanımlar
  @Get()  
  health() {
    return {                  
      status: "ok",             //Sağlık durumunu gösteren basit bir yanıt döndürür
      service: "nakliye-api",   //Hizmet adını belirtir
      mode: "bootstrap",        //Uygulamanın başlatılma modunu belirtir
    };
  }
}
