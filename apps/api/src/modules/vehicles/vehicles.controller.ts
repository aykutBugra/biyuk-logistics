import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,   //controller ihtiyaç duyduğu şeyler
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  Delete,
  Put,


} from "@nestjs/common";  

//bu importlar proje için parçalar . örneğin dto lar data transfer
//  object ler yani veri transferi için kullanılan nesneler.
//  guardlar ise güvenlik için kullanılan parçalar. service ise
//  iş mantığını içeren parçadır. repository ise veri erişim katmanıdır.
import { ROLE_NAMES } from "../../common/constants/role-names";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";

import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { VehicleDetailResponseDto } from "./dto/vehicle-detail-response.dto";
import { VehicleListItemResponseDto } from "./dto/vehicle-list-item-response.dto";
import { VehiclesService } from "./vehicles.service";

//bu sınıfın base route u nu vehicles yapıyoruz. yani bu controller altındaki
//  route lar /vehicles ile başlayacak
@Controller("vehicles")
@UseGuards(JwtAuthGuard, RolesGuard)  //bu controller a erişim için role kontrolü yapılıyor. 
@Roles(ROLE_NAMES.NAKLIYECI) //bu controller a sadece nakliyeci rolüne sahip kullanıcılar erişebilir.

export class VehiclesController { //controller sınıfı route metodlarını toplar. 
  constructor(private readonly vehiclesService: VehiclesService) {}   //private readonly ile bu sınıfın içinde vehiclesService i kullanabileceğiz. dışarıdan değiştirilemez.

  @Post()   //bu metod post isteği ile çalışır. yani /vehicles route una post isteği atıldığında bu metod çalışır.
  @HttpCode(HttpStatus.CREATED) //başarılı olunca 201 status kodu döner.
  create(   //create endpointi için metod. bu metod createVehicleDto alır ve VehicleDetailResponseDto döner.
    @CurrentUser() currentUser: AuthenticatedUser, //bu dekoratör ile şuanki kullanıcıyı alırız. bu kullanıcı authenticatedUser tipindedir.
    @Body() createVehicleDto: CreateVehicleDto    //bu dekoratör ile request body sinden createVehicleDto alırız. bu dto createVehicleDto tipindedir.
  ): Promise<VehicleDetailResponseDto> {  //promise döner çünkü bu metod async çalışır. yani veritabanı işlemi gibi zaman alabilecek işlemler yapar.
    return this.vehiclesService.create(currentUser, createVehicleDto);  //
  }

  @Get("my")  //bu endpoint kullanıcı kendi araçlarını görmek istediğinde çalışır. yani /vehicles/my route una get isteği atıldığında bu metod çalışır.
  getMine(    //yine sadece currentUser alırız çünkü bu endpointteki araçlar kullanıcının kendi araçlarıdır.
    @CurrentUser() currentUser: AuthenticatedUser
  ): Promise<VehicleListItemResponseDto[]> {    //yani liste dönecek çünkü birden fazla araç olabilir.her eleman VehicleListItemResponseDto tipinde olacak.
    return this.vehiclesService.getMine(currentUser); //controller sadece service i çağırır. iş mantığı service de olur. controller sadece gelen isteği alır, service e iletir ve sonucu döner.
  }

  @Get(":id") //bu endpoint kullanıcı kendi araçlarından birinin detayını görmek istediğinde çalışır. yani /vehicles/:id route una get isteği atıldığında bu metod çalışır. :id dinamik bir parametredir.
  getMineById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", ParseIntPipe) id: number //buradaki @Param dekoratörü ile route parametresinden id yi alırız. böylece seçilen araç id sine göre detay dönebiliriz. ParseIntPipe ile id nin integer olmasını sağlarız.
  ): Promise<VehicleDetailResponseDto> {
    return this.vehiclesService.getMineById(currentUser, id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT) //silme işlemi başarılı olunca 204 status kodu döner.
  async deleteById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", ParseIntPipe) id: number
  ): Promise<void> {
    await this.vehiclesService.deleteById(currentUser, id);
  }


  @Put(":id")  //bu endpoint kullanıcı kendi araçlarından birini güncellemek istediğinde çalışır. yani /vehicles/:id route una put isteği atıldığında bu metod çalışır. :id dinamik bir parametredir.
  async updateById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", ParseIntPipe) id: number,
    @Body() updateVehicleDto: CreateVehicleDto //güncelleme için createVehicleDto kullanıyoruz çünkü güncelleme ve oluşturma için aynı veriler gerekiyor. bu dto da plaka, marka, model, yıl, kapasite gibi bilgiler var.
  ): Promise<VehicleDetailResponseDto> {
        console.log("controller Başlangıcı" );
    return await this.vehiclesService.updateById(currentUser, id, updateVehicleDto);
  }


  


}
