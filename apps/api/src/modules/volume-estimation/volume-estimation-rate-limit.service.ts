import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class VolumeEstimationRateLimitService {
  //Basit in-memory rate limit tutulur. Uygulama yeniden baslarsa sayaçlar da sifirlanir.
  private readonly requestTimestampsByUserId = new Map<number, number[]>();

  constructor(private readonly configService: ConfigService) {}

  //Kullanici bazinda hem kisa pencere hem gunluk limit kontrol edilir.
  //Limit asilmazsa mevcut istek zamani listeye eklenir.
  assertWithinLimit(userId: number) {
    const now = Date.now();

    const shortWindowLimit =
      this.configService.get<number>("ai.volumeEstimationShortWindowLimit") ?? 3;

    const shortWindowMinutes =
      this.configService.get<number>("ai.volumeEstimationShortWindowMinutes") ?? 10;

    const dailyLimit =
      this.configService.get<number>("ai.volumeEstimationDailyLimit") ?? 20;

    const shortWindowMs = shortWindowMinutes * 60 * 1000;
    const dailyWindowMs = 24 * 60 * 60 * 1000;

    const previousTimestamps =
      this.requestTimestampsByUserId.get(userId) ?? [];

    const activeTimestamps = previousTimestamps.filter(
      (timestamp) => now - timestamp < dailyWindowMs
    );

    const shortWindowRequestCount = activeTimestamps.filter(
      (timestamp) => now - timestamp < shortWindowMs
    ).length;

    if (shortWindowRequestCount >= shortWindowLimit) {
      throw new HttpException(
        `Hacim tahmini icin kisa sureli limit asildi. Lutfen daha sonra tekrar dene.`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    if (activeTimestamps.length >= dailyLimit) {
      throw new HttpException(
        `Gunluk hacim tahmini limitine ulasildi. Lutfen yarin tekrar dene.`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    activeTimestamps.push(now);
    this.requestTimestampsByUserId.set(userId, activeTimestamps);
  }
}
