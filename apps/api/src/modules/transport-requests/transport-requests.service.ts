import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ROLE_NAMES } from "../../common/constants/role-names";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { CreateTransportRequestDto } from "./dto/create-transport-request.dto";
import { TransportRequestDetailResponseDto } from "./dto/transport-request-detail-response.dto";
import { TransportRequestListItemResponseDto } from "./dto/transport-request-list-item-response.dto";
import {
  type StoredTransportRequestRecord,
  TransportRequestsRepository,
} from "./repositories/transport-requests.repository";

const INITIAL_TRANSPORT_REQUEST_STATUS = {
  durumTuru: "ISTEK",
  durumAdi: "OLUSTURULDU",
} as const;

@Injectable()
export class TransportRequestsService {
  constructor(
    private readonly transportRequestsRepository: TransportRequestsRepository
  ) {}

  async create(
    currentUser: AuthenticatedUser,
    createTransportRequestDto: CreateTransportRequestDto
  ): Promise<TransportRequestDetailResponseDto> {
    this.assertCustomerRole(currentUser);

    const initialStatusId = await this.requireInitialStatusId();
    const transportRequest = await this.transportRequestsRepository.create({
      musteriId: currentUser.id,
      baslangicSehri: createTransportRequestDto.baslangicSehri,
      varisSehri: createTransportRequestDto.varisSehri,
      baslangicEnlem: createTransportRequestDto.baslangicEnlem,
      baslangicBoylam: createTransportRequestDto.baslangicBoylam,
      varisEnlem: createTransportRequestDto.varisEnlem,
      varisBoylam: createTransportRequestDto.varisBoylam,
      yukDetay: createTransportRequestDto.yukDetay,
      durumId: initialStatusId,
    });

    return this.toDetailResponse(transportRequest);
  }

  async getMine(
    currentUser: AuthenticatedUser
  ): Promise<TransportRequestListItemResponseDto[]> {
    this.assertCustomerRole(currentUser);

    const transportRequests = await this.transportRequestsRepository.findManyByCustomerId(
      currentUser.id
    );

    return transportRequests.map((transportRequest) =>
      this.toListItemResponse(transportRequest)
    );
  }

  async getMineById(
    currentUser: AuthenticatedUser,
    id: number
  ): Promise<TransportRequestDetailResponseDto> {
    this.assertCustomerRole(currentUser);

    const transportRequest = await this.transportRequestsRepository.findByIdAndCustomerId(
      id,
      currentUser.id
    );

    if (!transportRequest) {
      throw new NotFoundException("Transport request not found.");
    }

    return this.toDetailResponse(transportRequest);
  }

  private async requireInitialStatusId(): Promise<number> {
    const initialStatusId =
      await this.transportRequestsRepository.findStatusIdByTypeAndName(
        INITIAL_TRANSPORT_REQUEST_STATUS.durumTuru,
        INITIAL_TRANSPORT_REQUEST_STATUS.durumAdi
      );

    if (initialStatusId !== null) {
      return initialStatusId;
    }

    throw new InternalServerErrorException(
      `Transport request initial status is not configured: ${INITIAL_TRANSPORT_REQUEST_STATUS.durumTuru}/${INITIAL_TRANSPORT_REQUEST_STATUS.durumAdi}.`
    );
  }

  private assertCustomerRole(currentUser: AuthenticatedUser) {
    if (currentUser.roles.includes(ROLE_NAMES.MUSTERI)) {
      return;
    }

    throw new ForbiddenException("Only customers can manage transport requests.");
  }

  private toListItemResponse(
    transportRequest: StoredTransportRequestRecord
  ): TransportRequestListItemResponseDto {
    return {
      id: transportRequest.id,
      baslangicSehri: transportRequest.baslangicSehri,
      varisSehri: transportRequest.varisSehri,
      yukDetay: transportRequest.yukDetay,
      olusturmaTarihi: transportRequest.olusturmaTarihi,
      durum: transportRequest.durumAdi,
    };
  }

  private toDetailResponse(
    transportRequest: StoredTransportRequestRecord
  ): TransportRequestDetailResponseDto {
    return {
      ...this.toListItemResponse(transportRequest),
      baslangicEnlem: transportRequest.baslangicEnlem,
      baslangicBoylam: transportRequest.baslangicBoylam,
      varisEnlem: transportRequest.varisEnlem,
      varisBoylam: transportRequest.varisBoylam,
    };
  }
}
