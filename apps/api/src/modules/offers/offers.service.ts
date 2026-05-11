import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ROLE_NAMES } from "../../common/constants/role-names";
import { RequestImageResponseDto } from "../../common/dto/request-image-response.dto";
import { RequestImageSummaryResponseDto } from "../../common/dto/request-image-summary-response.dto";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { unwrapTransactionResult } from "../../common/utils/unwrap-transaction-result";
import { MediaStorageService } from "../../infrastructure/media/media-storage.service";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { normalizeCityFilter } from "../../common/utils/normalize-city-filter";
import { OfferThreadsService } from "../offer-threads/offer-threads.service";
import { CarrierRoutesService } from "../carrier-routes/carrier-routes.service";
import { CreateOfferDto } from "./dto/create-offer.dto";
import { IncomingOfferListItemResponseDto } from "./dto/incoming-offer-list-item-response.dto";
import { MyIncomingOfferListItemResponseDto } from "./dto/my-incoming-offer-list-item-response.dto";
import { MyOfferListItemResponseDto } from "./dto/my-offer-list-item-response.dto";
import { OfferResponseDto } from "./dto/offer-response.dto";
import { OpenRequestDetailResponseDto } from "./dto/open-request-detail-response.dto";
import { OpenRequestDetailQueryDto } from "./dto/open-request-detail-query.dto";
import { OpenRequestListItemResponseDto } from "./dto/open-request-list-item-response.dto";
import { OpenRequestQueryDto } from "./dto/open-request-query.dto";
import {
  OpenRequestRouteAwareEvaluator,
  type OpenRequestRouteFilterEvaluation,
  type OpenRequestRouteCompatibilityResult,
} from "./open-request-route-aware-evaluator.service";
import {
  type IncomingOfferListItemRecord,
  type MyIncomingOfferListItemRecord,
  type OpenRequestFilters,
  type OfferDecisionContextRecord,
  type OpenRequestDetailRecord,
  type OpenRequestImageRecord,
  type OpenRequestListItemRecord,
  type StoredOfferRecord,
  OffersRepository,
} from "./repositories/offers.repository";
import { NotificationsPublisher } from "../notifications/notifications.publisher";
import { VehicleCapacityService } from "../vehicle-capacity/vehicle-capacity.service";

const OPEN_OFFER_STATUS = {
  durumTuru: "TEKLIF",
  durumAdi: "OLUSTURULDU",
} as const;

const ACCEPTED_OFFER_STATUS = {
  durumTuru: "TEKLIF",
  durumAdi: "KABUL_EDILDI",
} as const;

const REJECTED_OFFER_STATUS = {
  durumTuru: "TEKLIF",
  durumAdi: "REDDEDILDI",
} as const;

const OPEN_TRANSPORT_REQUEST_STATUS = {
  durumTuru: "ISTEK",
  durumAdi: "OLUSTURULDU",
} as const;

const AGREED_TRANSPORT_REQUEST_STATUS = {
  durumTuru: "ISTEK",
  durumAdi: "ANLASILDI",
} as const;

const INITIAL_SHIPMENT_STATUS = {
  durumTuru: "NAKLIYE",
  durumAdi: "OLUSTURULDU",
} as const;

@Injectable()
export class OffersService {
  constructor(
    private readonly offersRepository: OffersRepository,
    private readonly notificationsPublisher: NotificationsPublisher,
    private readonly carrierRoutesService: CarrierRoutesService,
    private readonly openRequestRouteAwareEvaluator: OpenRequestRouteAwareEvaluator,
    private readonly offerThreadsService: OfferThreadsService,
    private readonly vehicleCapacityService: VehicleCapacityService,
    private readonly mediaStorageService: MediaStorageService,
    private readonly prisma: PrismaService
  ) {}

  // Acik istekler listesini once normal discovery filtreleriyle toplar, sonra
  // secili route varsa evaluator sonucunda sadece MATCH olan kayitlari birakir.
  async getOpenRequests(
    currentUser: AuthenticatedUser,
    query: OpenRequestQueryDto
  ): Promise<OpenRequestListItemResponseDto[]> {
    this.assertCarrierRole(currentUser);
    this.assertRouteFilterContext(query.carrierRouteId, query.maxSapmaKm);

    // Route filtresi yalnizca carrierRouteId secildiyse devreye girer; route secimi
    // yoksa ekran klasik discovery havuzu ile calisir.
    const selectedCarrierRoute =
      typeof query.carrierRouteId === "number"
        ? await this.carrierRoutesService.getMineById(
            currentUser,
            query.carrierRouteId
          )
        : null;

    if (
      selectedCarrierRoute &&
      !this.openRequestRouteAwareEvaluator.isCarrierRouteReady(selectedCarrierRoute)
    ) {
      throw new ConflictException(
        "Secili rota route filtre icin hazir degil."
      );
    }

    // SQL tarafinda sadece temel discovery havuzu cekilir; rota sapma filtresi
    // repository'de degil servis + evaluator katmaninda uygulanir.
    const requests = await this.offersRepository.findOpenRequestsForCarrier(
      currentUser.id,
      this.toOpenRequestFilters(query)
    );

    let filteredRequests = requests;
    const routeCompatibilities = new Map<number, OpenRequestRouteCompatibilityResult>();

    if (selectedCarrierRoute) {
      // Her request route evaluator'dan gecer; sadece MATCH olanlar listede kalir
      // ve response'a rotaUyumu nesnesi baglanir.
      const routeEvaluations =
        await this.openRequestRouteAwareEvaluator.evaluateMany(
          selectedCarrierRoute,
          requests,
          query.maxSapmaKm
        );

      if (this.hasUnavailableRouteService(routeEvaluations)) {
        throw new ServiceUnavailableException(
          "Secili rota filtresi su anda uygulanamiyor."
        );
      }

      filteredRequests = requests.filter((request) => {
        const evaluation = routeEvaluations.get(request.id);

        if (!evaluation || evaluation.status !== "MATCH") {
          return false;
        }

        routeCompatibilities.set(request.id, evaluation.compatibility);
        return true;
      });
    }

    return filteredRequests.map((request) =>
      this.toOpenRequestListItemResponse(
        request,
        routeCompatibilities.get(request.id) ?? null
      )
    );
  }

  async getOpenRequestById(
    currentUser: AuthenticatedUser,
    requestId: number,
    query: OpenRequestDetailQueryDto
  ): Promise<OpenRequestDetailResponseDto> {
    // Detail ekraninda da ayni route filtresi zorlanir; secili route'a uymayan bir
    // request detay seviyesinde goruntulenemez.
    this.assertCarrierRole(currentUser);
    this.assertRouteFilterContext(query.carrierRouteId, query.maxSapmaKm);

    const request = await this.offersRepository.findOpenRequestByIdForCarrier(
      requestId,
      currentUser.id
    );

    if (!request) {
      throw new NotFoundException("Transport request not found.");
    }

    const hasActiveVehicle = await this.offersRepository.carrierHasActiveVehicle(
      currentUser.id
    );
    const selectedCarrierRoute =
      typeof query.carrierRouteId === "number"
        ? await this.carrierRoutesService.getMineById(
            currentUser,
            query.carrierRouteId
          )
        : null;
    let routeCompatibility: OpenRequestRouteCompatibilityResult | null = null;

    if (selectedCarrierRoute) {
      if (!this.openRequestRouteAwareEvaluator.isCarrierRouteReady(selectedCarrierRoute)) {
        throw new ConflictException(
          "Secili rota route filtre icin hazir degil."
        );
      }

      // Detail seviyesinde evaluator tek kayit icin calisir ve sonucu 404, 409,
      // 503 veya compatibility nesnesi olarak yorumlanir.
      const routeEvaluation = await this.openRequestRouteAwareEvaluator.evaluateOne(
        selectedCarrierRoute,
        request,
        query.maxSapmaKm
      );

      switch (routeEvaluation.status) {
        case "MATCH":
          routeCompatibility = routeEvaluation.compatibility;
          break;
        case "OUTSIDE_ROUTE_FILTER":
          throw new NotFoundException(
            "Bu istek secili rota filtresine uymuyor."
          );
        case "UNAVAILABLE_DATA":
          throw new ConflictException(
            "Bu istek secili rota filtresi icin degerlendirilemiyor."
          );
        case "UNAVAILABLE_ROUTE_SERVICE":
          throw new ServiceUnavailableException(
            "Secili rota filtresi su anda uygulanamiyor."
          );
      }
    }

    return {
      ...this.toOpenRequestDetailResponse(request, routeCompatibility),
      hasActiveVehicle,
      hasExistingOffer: request.hasExistingOffer,
    };
  }

  async create(
    currentUser: AuthenticatedUser,
    requestId: number,
    createOfferDto: CreateOfferDto
  ): Promise<OfferResponseDto> {
    this.assertCarrierRole(currentUser);

    const request = await this.offersRepository.findOfferCreateContextByRequestId(
      requestId
    );

    if (!request || request.silmeTarihi) {
      throw new NotFoundException("Transport request not found.");
    }

    if (request.musteriId === currentUser.id) {
      throw new ForbiddenException(
        "You cannot create an offer for your own transport request."
      );
    }

    if (
      request.hasNakliye ||
      !this.isRequestOpenForOffers(request.durumTuru, request.durumAdi)
    ) {
      throw new ConflictException(
        "This transport request is no longer open for offers."
      );
    }

    const selectedVehicle = await this.offersRepository.findActiveVehicleByIdAndOwnerId(
      createOfferDto.aracId,
      currentUser.id
    );

    if (!selectedVehicle) {
      throw new ConflictException(
        "The selected vehicle is not an active vehicle of the current carrier."
      );
    }

    const hasExistingOffer =
      await this.offersRepository.carrierHasExistingOfferForRequest(
        currentUser.id,
        requestId
      );

    if (hasExistingOffer) {
      throw new ConflictException(
        "You have already created an open offer for this transport request."
      );
    }

    const initialStatusId = await this.requireStatusId(
      OPEN_OFFER_STATUS.durumTuru,
      OPEN_OFFER_STATUS.durumAdi,
      "Offer initial status"
    );
    const offer = await this.prisma.client.$transaction(async (tx) => {
      const createdOffer = await this.offersRepository.create(
        {
          istekId: requestId,
          nakliyeciId: currentUser.id,
          aracId: selectedVehicle.id,
          fiyat: createOfferDto.fiyat,
          not: createOfferDto.not?.trim() || null,
          durumId: initialStatusId,
        },
        tx
      );

      // Her yeni offer için aynı transaction içinde tekil bir konuşma thread'i açılır.
      // Böylece daha ilk andan itibaren pazarlık bağlamı request'e değil offer'a bağlanır.
      await this.offerThreadsService.bootstrapThreadForOffer(
        {
          offerId: createdOffer.id,
          requestId,
          customerId: request.musteriId,
          carrierId: currentUser.id,
          teklifFiyati: createdOffer.fiyat,
        },
        tx
      );

      return createdOffer;
    });

    await this.notificationsPublisher.publishIncomingOffer({
      customerId: request.musteriId,
      offerId: offer.id,
      requestId,
      actorUserId: currentUser.id,
      route: {
        baslangicSehri: offer.baslangicSehri,
        varisSehri: offer.varisSehri,
      },
    });

    return this.toOfferResponse(offer);
  }

  async getMine(
    currentUser: AuthenticatedUser
  ): Promise<MyOfferListItemResponseDto[]> {
    this.assertCarrierRole(currentUser);

    const offers = await this.offersRepository.findMyOffersByCarrierId(
      currentUser.id
    );

    return offers.map((offer) => this.toMyOfferListItemResponse(offer));
  }

  async getMyIncoming(
    currentUser: AuthenticatedUser
  ): Promise<MyIncomingOfferListItemResponseDto[]> {
    this.assertCustomerRole(currentUser);

    const offers = await this.offersRepository.findMyIncomingOffersByCustomerId(
      currentUser.id
    );

    return offers.map((offer) => this.toMyIncomingOfferListItemResponse(offer));
  }

  async getIncomingForRequest(
    currentUser: AuthenticatedUser,
    requestId: number
  ): Promise<IncomingOfferListItemResponseDto[]> {
    this.assertCustomerRole(currentUser);

    const activeRequestId =
      await this.offersRepository.findActiveRequestIdByCustomerId(
        requestId,
        currentUser.id
      );

    if (!activeRequestId) {
      throw new NotFoundException("Transport request not found.");
    }

    const offers = await this.offersRepository.findIncomingOffersByRequestId(
      activeRequestId
    );

    return offers.map((offer) => this.toIncomingOfferListItemResponse(offer));
  }

  async acceptById(
    currentUser: AuthenticatedUser,
    offerId: number
  ): Promise<void> {
    this.assertCustomerRole(currentUser);

    const offer = await this.requireDecisionContext(currentUser, offerId);

    if (!this.isOfferOpen(offer.offerStatusTuru, offer.offerStatusAdi)) {
      throw new ConflictException("Offer can no longer be accepted.");
    }

    if (
      offer.hasShipment ||
      !this.isRequestOpenForOffers(offer.requestStatusTuru, offer.requestStatusAdi)
    ) {
      throw new ConflictException(
        "This transport request is no longer open for offer decisions."
      );
    }

    if (
      offer.aracId === null ||
      offer.aracDeletedAt !== null ||
      offer.aracOwnerId !== offer.carrierId
    ) {
      throw new ConflictException(
        "Accepted offer no longer has an active vehicle."
      );
    }

    const [
      openOfferStatusId,
      acceptedOfferStatusId,
      rejectedOfferStatusId,
      openRequestStatusId,
      agreedRequestStatusId,
      initialShipmentStatusId,
    ] = await Promise.all([
      this.requireStatusId(
        OPEN_OFFER_STATUS.durumTuru,
        OPEN_OFFER_STATUS.durumAdi,
        "Offer initial status"
      ),
      this.requireStatusId(
        ACCEPTED_OFFER_STATUS.durumTuru,
        ACCEPTED_OFFER_STATUS.durumAdi,
        "Offer accepted status"
      ),
      this.requireStatusId(
        REJECTED_OFFER_STATUS.durumTuru,
        REJECTED_OFFER_STATUS.durumAdi,
        "Offer rejected status"
      ),
      this.requireStatusId(
        OPEN_TRANSPORT_REQUEST_STATUS.durumTuru,
        OPEN_TRANSPORT_REQUEST_STATUS.durumAdi,
        "Transport request initial status"
      ),
      this.requireStatusId(
        AGREED_TRANSPORT_REQUEST_STATUS.durumTuru,
        AGREED_TRANSPORT_REQUEST_STATUS.durumAdi,
        "Transport request agreed status"
      ),
      this.requireStatusId(
        INITIAL_SHIPMENT_STATUS.durumTuru,
        INITIAL_SHIPMENT_STATUS.durumAdi,
        "Shipment initial status"
      ),
    ]);

    let result;

    try {
      result = await this.prisma.client.$transaction(async (tx) => {
        const acceptance = unwrapTransactionResult(
          await this.offersRepository.acceptOfferInTransaction(tx, {
            offerId: offer.offerId,
            requestId: offer.requestId,
            openOfferStatusId,
            acceptedOfferStatusId,
            rejectedOfferStatusId,
            openRequestStatusId,
            agreedRequestStatusId,
            initialShipmentStatusId,
            carrierId: offer.carrierId,
            aracId: offer.aracId!,
            fiyat: offer.fiyat,
          }),
          (reason) =>
            new ConflictException(
              reason === "shipment_exists"
                ? "A shipment has already been created for this transport request."
                : "Offer can no longer be accepted."
            )
        );

        // Kazanan offer kendi thread'ini kabul event'i ile kapatır; rakip açık thread'ler
        // ise request artık müsait değil mantığıyla ayrı ayrı read-only kapanır.
        await this.offerThreadsService.closeAcceptedOfferThread(
          offer.offerId,
          currentUser.id,
          tx
        );

        if (acceptance.rejectedSiblingOffers.length > 0) {
          await this.offerThreadsService.closeRequestUnavailableThreads(
            acceptance.rejectedSiblingOffers.map(
              (rejectedOffer) => rejectedOffer.offerId
            ),
            currentUser.id,
            tx
          );
        }

        await this.vehicleCapacityService.createReservationForShipment(
          acceptance.reservationSnapshot,
          tx
        );

        return acceptance;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "A shipment has already been created for this transport request."
        );
      }

      throw error;
    }

    await this.notificationsPublisher.publishOfferAccepted({
      carrierId: offer.carrierId,
      offerId: offer.offerId,
      requestId: offer.requestId,
      jobId: result.jobId,
      actorUserId: currentUser.id,
    });

    await Promise.all(
      result.rejectedSiblingOffers.map((rejectedOffer) =>
        this.notificationsPublisher.publishOfferRejected({
          carrierId: rejectedOffer.carrierId,
          offerId: rejectedOffer.offerId,
          requestId: offer.requestId,
          actorUserId: currentUser.id,
        })
      )
    );
  }

  async rejectById(
    currentUser: AuthenticatedUser,
    offerId: number
  ): Promise<void> {
    this.assertCustomerRole(currentUser);

    const offer = await this.requireDecisionContext(currentUser, offerId);

    if (!this.isOfferOpen(offer.offerStatusTuru, offer.offerStatusAdi)) {
      throw new ConflictException("Offer can no longer be rejected.");
    }

    if (
      offer.hasShipment ||
      !this.isRequestOpenForOffers(offer.requestStatusTuru, offer.requestStatusAdi)
    ) {
      throw new ConflictException(
        "This transport request is no longer open for offer decisions."
      );
    }

    const rejectedStatusId = await this.requireStatusId(
      REJECTED_OFFER_STATUS.durumTuru,
      REJECTED_OFFER_STATUS.durumAdi,
      "Offer rejected status"
    );

    const wasRejected = await this.prisma.client.$transaction(async (tx) => {
      const rejected = await this.offersRepository.rejectOpenOfferById(
        offer.offerId,
        rejectedStatusId,
        tx
      );

      if (!rejected) {
        return false;
      }

      await this.offerThreadsService.closeRejectedOfferThread(
        offer.offerId,
        currentUser.id,
        tx
      );

      return true;
    });

    if (!wasRejected) {
      throw new ConflictException("Offer can no longer be rejected.");
    }

    await this.notificationsPublisher.publishOfferRejected({
      carrierId: offer.carrierId,
      offerId: offer.offerId,
      requestId: offer.requestId,
      actorUserId: currentUser.id,
    });
  }

  private async requireDecisionContext(
    currentUser: AuthenticatedUser,
    offerId: number
  ): Promise<OfferDecisionContextRecord> {
    const offer = await this.offersRepository.findOfferDecisionContextById(offerId);

    if (!offer || offer.requestDeletedAt || offer.customerId !== currentUser.id) {
      throw new NotFoundException("Offer not found.");
    }

    if (offer.customerId === offer.carrierId) {
      throw new ConflictException(
        "Offer decisions are blocked because the transport request owner and offer carrier resolve to the same user."
      );
    }

    return offer;
  }

  private async requireStatusId(
    durumTuru: string,
    durumAdi: string,
    label: string
  ): Promise<number> {
    const statusId = await this.offersRepository.findStatusIdByTypeAndName(
      durumTuru,
      durumAdi
    );

    if (statusId !== null) {
      return statusId;
    }

    throw new InternalServerErrorException(
      `${label} is not configured: ${durumTuru}/${durumAdi}.`
    );
  }

  private isRequestOpenForOffers(durumTuru: string, durumAdi: string): boolean {
    return (
      durumTuru.trim().toUpperCase() === OPEN_TRANSPORT_REQUEST_STATUS.durumTuru &&
      durumAdi.trim().toUpperCase() === OPEN_TRANSPORT_REQUEST_STATUS.durumAdi
    );
  }

  private isOfferOpen(durumTuru: string, durumAdi: string): boolean {
    return (
      durumTuru.trim().toUpperCase() === OPEN_OFFER_STATUS.durumTuru &&
      durumAdi.trim().toUpperCase() === OPEN_OFFER_STATUS.durumAdi
    );
  }

  private assertCarrierRole(currentUser: AuthenticatedUser) {
    if (currentUser.roles.includes(ROLE_NAMES.NAKLIYECI)) {
      return;
    }

    throw new ForbiddenException("Only carriers can manage offers.");
  }

  private assertCustomerRole(currentUser: AuthenticatedUser) {
    if (currentUser.roles.includes(ROLE_NAMES.MUSTERI)) {
      return;
    }

    throw new ForbiddenException("Only customers can access incoming offers.");
  }

  private assertRouteFilterContext(
    carrierRouteId: number | undefined,
    maxSapmaKm: number | undefined
  ) {
    if (typeof maxSapmaKm === "number" && typeof carrierRouteId !== "number") {
      throw new BadRequestException(
        "maxSapmaKm can only be used when carrierRouteId is provided."
      );
    }
  }

  private toOpenRequestListItemResponse(
    request: OpenRequestListItemRecord,
    rotaUyumu: OpenRequestRouteCompatibilityResult | null = null
  ): OpenRequestListItemResponseDto {
    // Liste response'u, route filtresi uygulanmissa evaluator'dan gelen compatibility
    // nesnesini de kartlarda gosterilecek sekilde disari tasir.
    return {
      id: request.id,
      baslangicSehri: request.baslangicSehri,
      varisSehri: request.varisSehri,
      baslangicKonumMetni: request.baslangicKonumMetni,
      varisKonumMetni: request.varisKonumMetni,
      baslangicEnlem: request.baslangicEnlem,
      baslangicBoylam: request.baslangicBoylam,
      varisEnlem: request.varisEnlem,
      varisBoylam: request.varisBoylam,
      rotaMesafeMetre: request.rotaMesafeMetre,
      rotaSureSaniye: request.rotaSureSaniye,
      tekTasimaIstiyor: request.tekTasimaIstiyor,
      agirlikKg: request.agirlikKg,
      hacimM3: request.hacimM3,
      yukTipi: request.yukTipi,
      tasimaTarihi: request.tasimaTarihi,
      yukDetay: request.yukDetay,
      olusturmaTarihi: request.olusturmaTarihi,
      durum: request.durumAdi,
      alreadyOffered: request.alreadyOffered,
      rotaUyumu,
      primaryImage: request.primaryImage
        ? this.toImageSummaryResponse(request.primaryImage)
        : undefined,
      imageCount: request.imageCount > 0 ? request.imageCount : undefined,
    };
  }

  private toOpenRequestDetailResponse(
    request: OpenRequestDetailRecord,
    rotaUyumu: OpenRequestRouteCompatibilityResult | null = null
  ): OpenRequestDetailResponseDto {
    // Detail response'u listeyle ayni rotaUyumu yapisini korur; detail'e ozel
    // provider, placeId ve normalize alanlarini da ayni payload'a ekler.
    return {
      ...this.toOpenRequestListItemResponse(request, rotaUyumu),
      baslangicProvider: request.baslangicProvider,
      varisProvider: request.varisProvider,
      baslangicPlaceId: request.baslangicPlaceId,
      varisPlaceId: request.varisPlaceId,
      normalizeBaslangicSehir: request.normalizeBaslangicSehir,
      normalizeVarisSehir: request.normalizeVarisSehir,
      normalizeBaslangicIlce: request.normalizeBaslangicIlce,
      normalizeVarisIlce: request.normalizeVarisIlce,
      hasActiveVehicle: false,
      hasExistingOffer: request.hasExistingOffer,
      images:
        request.images.length > 0
          ? request.images.map((image) => this.toImageResponse(image))
          : undefined,
      primaryImageId: request.primaryImageId,
    };
  }

  private toImageSummaryResponse(
    image: OpenRequestImageRecord
  ): RequestImageSummaryResponseDto {
    return {
      id: image.id,
      thumbnailUrl: this.mediaStorageService.toPublicUrl(image.thumbnailStorageKey),
      width: image.width,
      height: image.height,
    };
  }

  private toImageResponse(
    image: OpenRequestImageRecord
  ): RequestImageResponseDto {
    return {
      ...this.toImageSummaryResponse(image),
      url: this.mediaStorageService.toPublicUrl(image.storageKey),
      isPrimary: image.isPrimary,
    };
  }

  private hasUnavailableRouteService(
    evaluations: Map<number, OpenRequestRouteFilterEvaluation>
  ): boolean {
    // Liste evaluasyonlarinda tek bir route servis hatasi bile varsa bunu sayfa
    // bazli gecici bir problem olarak ele alir.
    for (const evaluation of evaluations.values()) {
      if (evaluation.status === "UNAVAILABLE_ROUTE_SERVICE") {
        return true;
      }
    }

    return false;
  }

  private toOpenRequestFilters(query: OpenRequestQueryDto): OpenRequestFilters {
    // Query param'dan gelen manuel filtreleri repository'nin anlayacagi discovery
    // filtre nesnesine cevirir; route filtresi bu asamada eklenmez.
    return {
      baslangicSehir: normalizeCityFilter(query.baslangicSehir),
      varisSehir: normalizeCityFilter(query.varisSehir),
      tekTasimaIstiyor: query.tekTasimaIstiyor,
      minAgirlikKg: query.minAgirlikKg,
      maxAgirlikKg: query.maxAgirlikKg,
      minHacimM3: query.minHacimM3,
      maxHacimM3: query.maxHacimM3,
      yukTipi: query.yukTipi,
      tasimaTarihi: query.tasimaTarihi,
    };
  }

  private toOfferResponse(offer: StoredOfferRecord): OfferResponseDto {
    return {
      id: offer.id,
      requestId: offer.requestId,
      baslangicSehri: offer.baslangicSehri,
      varisSehri: offer.varisSehri,
      aracId: offer.aracId,
      aracPlaka: offer.aracPlaka,
      fiyat: offer.fiyat,
      not: offer.not,
      durum: offer.durumAdi,
    };
  }

  private toMyOfferListItemResponse(
    offer: StoredOfferRecord
  ): MyOfferListItemResponseDto {
    return this.toOfferResponse(offer);
  }

  private toIncomingOfferListItemResponse(
    offer: IncomingOfferListItemRecord
  ): IncomingOfferListItemResponseDto {
    return {
      id: offer.id,
      requestId: offer.requestId,
      carrierId: offer.carrierId,
      carrierName: offer.carrierName,
      carrierUsername: offer.carrierUsername,
      aracId: offer.aracId,
      aracPlaka: offer.aracPlaka,
      fiyat: offer.fiyat,
      not: offer.not,
      durum: offer.durumAdi,
    };
  }

  private toMyIncomingOfferListItemResponse(
    offer: MyIncomingOfferListItemRecord
  ): MyIncomingOfferListItemResponseDto {
    return {
      id: offer.id,
      requestId: offer.requestId,
      baslangicSehri: offer.baslangicSehri,
      varisSehri: offer.varisSehri,
      baslangicKonumMetni: offer.baslangicKonumMetni,
      varisKonumMetni: offer.varisKonumMetni,
      tekTasimaIstiyor: offer.tekTasimaIstiyor,
      agirlikKg: offer.agirlikKg,
      hacimM3: offer.hacimM3,
      yukTipi: offer.yukTipi,
      tasimaTarihi: offer.tasimaTarihi,
      carrierId: offer.carrierId,
      carrierName: offer.carrierName,
      carrierUsername: offer.carrierUsername,
      aracId: offer.aracId,
      aracPlaka: offer.aracPlaka,
      fiyat: offer.fiyat,
      not: offer.not,
      durum: offer.durumAdi,
    };
  }
}
