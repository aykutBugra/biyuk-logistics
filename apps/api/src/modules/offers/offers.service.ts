import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ROLE_NAMES } from "../../common/constants/role-names";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { CreateOfferDto } from "./dto/create-offer.dto";
import { IncomingOfferListItemResponseDto } from "./dto/incoming-offer-list-item-response.dto";
import { MyOfferListItemResponseDto } from "./dto/my-offer-list-item-response.dto";
import { OfferResponseDto } from "./dto/offer-response.dto";
import { OpenRequestDetailResponseDto } from "./dto/open-request-detail-response.dto";
import { OpenRequestListItemResponseDto } from "./dto/open-request-list-item-response.dto";
import {
  type IncomingOfferListItemRecord,
  type OfferDecisionContextRecord,
  type OpenRequestDetailRecord,
  type OpenRequestListItemRecord,
  type StoredOfferRecord,
  OffersRepository,
} from "./repositories/offers.repository";

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
  constructor(private readonly offersRepository: OffersRepository) {}

  async getOpenRequests(
    currentUser: AuthenticatedUser
  ): Promise<OpenRequestListItemResponseDto[]> {
    this.assertCarrierRole(currentUser);

    const requests = await this.offersRepository.findOpenRequestsForCarrier(
      currentUser.id
    );

    return requests.map((request) => this.toOpenRequestListItemResponse(request));
  }

  async getOpenRequestById(
    currentUser: AuthenticatedUser,
    requestId: number
  ): Promise<OpenRequestDetailResponseDto> {
    this.assertCarrierRole(currentUser);

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

    return {
      ...this.toOpenRequestDetailResponse(request),
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
    const offer = await this.offersRepository.create({
      istekId: requestId,
      nakliyeciId: currentUser.id,
      aracId: selectedVehicle.id,
      fiyat: createOfferDto.fiyat,
      not: createOfferDto.not?.trim() || null,
      durumId: initialStatusId,
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

    const result = await this.offersRepository.acceptOffer({
      offerId: offer.offerId,
      requestId: offer.requestId,
      openOfferStatusId,
      acceptedOfferStatusId,
      rejectedOfferStatusId,
      openRequestStatusId,
      agreedRequestStatusId,
      initialShipmentStatusId,
      carrierId: offer.carrierId,
      aracId: offer.aracId,
      fiyat: offer.fiyat,
    });

    if (result.ok) {
      return;
    }

    throw new ConflictException(
      result.reason === "shipment_exists"
        ? "A shipment has already been created for this transport request."
        : "Offer can no longer be accepted."
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

    const wasRejected = await this.offersRepository.rejectOpenOfferById(
      offer.offerId,
      rejectedStatusId
    );

    if (!wasRejected) {
      throw new ConflictException("Offer can no longer be rejected.");
    }
  }

  private async requireDecisionContext(
    currentUser: AuthenticatedUser,
    offerId: number
  ): Promise<OfferDecisionContextRecord> {
    const offer = await this.offersRepository.findOfferDecisionContextById(offerId);

    if (!offer || offer.requestDeletedAt || offer.customerId !== currentUser.id) {
      throw new NotFoundException("Offer not found.");
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

  private toOpenRequestListItemResponse(
    request: OpenRequestListItemRecord
  ): OpenRequestListItemResponseDto {
    return {
      id: request.id,
      baslangicSehri: request.baslangicSehri,
      varisSehri: request.varisSehri,
      yukDetay: request.yukDetay,
      olusturmaTarihi: request.olusturmaTarihi,
      durum: request.durumAdi,
      alreadyOffered: request.alreadyOffered,
    };
  }

  private toOpenRequestDetailResponse(
    request: OpenRequestDetailRecord
  ): OpenRequestDetailResponseDto {
    return {
      ...this.toOpenRequestListItemResponse(request),
      baslangicEnlem: request.baslangicEnlem,
      baslangicBoylam: request.baslangicBoylam,
      varisEnlem: request.varisEnlem,
      varisBoylam: request.varisBoylam,
      hasActiveVehicle: false,
      hasExistingOffer: request.hasExistingOffer,
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
}
