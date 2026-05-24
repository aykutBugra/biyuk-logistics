import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { CanonicalLocationResponseDto } from "./dto/canonical-location-response.dto";
import { LocationAutocompleteQueryDto } from "./dto/location-autocomplete-query.dto";
import { LocationSuggestionResponseDto } from "./dto/location-suggestion-response.dto";
import { LocationsService } from "./locations.service";

@Controller("locations")
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  //Konum arama inputu icin provider autocomplete sonucunu dondurur.
  //sessionToken varsa provider tarafinda ayni arama oturumunu takip etmek icin kullanilir.
  @Get("autocomplete")
  async autocomplete(
    @CurrentUser() _currentUser: AuthenticatedUser,
    @Query() query: LocationAutocompleteQueryDto
  ): Promise<LocationSuggestionResponseDto[]> {
    return this.locationsService.autocomplete(query.q, query.sessionToken);
  }

  //Secilen placeId'nin canonical konum detayini getirir. Transport request ve route
  //olusturma ekranlari bu detaydan sehir, ilce ve koordinat bilgisi alir.
  @Get("places/:placeId")
  async getPlaceDetails(
    @CurrentUser() _currentUser: AuthenticatedUser,
    @Param("placeId") placeId: string,
    @Query("sessionToken") sessionToken?: string
  ): Promise<CanonicalLocationResponseDto> {
    return this.locationsService.getPlaceDetails(placeId, sessionToken);
  }
}
