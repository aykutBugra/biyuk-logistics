import { ServiceUnavailableException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { OpenAiVolumeEstimationService } from "../src/modules/volume-estimation/openai-volume-estimation.service";
import type { VolumeAnalysisResult } from "../src/modules/volume-estimation/volume-estimation.types";

type ParserHarness = {
  parseResponse: (responseText: string) => VolumeAnalysisResult;
};

function createService(): ParserHarness {
  return new OpenAiVolumeEstimationService(
    {} as ConfigService
  ) as unknown as ParserHarness;
}

function validResponse(volumeProfile = "desk_table") {
  return JSON.stringify({
    items: [
      {
        label: "calisma masasi",
        loadType: "mobilya",
        shapeType: "flat",
        sizeClass: "large",
        volumeProfile,
        estimatedCount: 1,
        stackable: false,
        confidence: "high",
        fragile: false,
        disassemblable: true,
        spaceProfile: "wide",
        placementRisk: "low",
        notes: "Duz masa olarak yorumlandi.",
      },
    ],
    overallConfidence: "high",
    warnings: [],
  });
}

describe("OpenAiVolumeEstimationService response parser", () => {
  it("accepts a valid volumeProfile while preserving existing analysis fields", () => {
    const parser = createService();
    const result = parser.parseResponse(validResponse());

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      label: "calisma masasi",
      loadType: "mobilya",
      shapeType: "flat",
      sizeClass: "large",
      volumeProfile: "desk_table",
      estimatedCount: 1,
      stackable: false,
      confidence: "high",
      fragile: false,
      disassemblable: true,
      spaceProfile: "wide",
      placementRisk: "low",
    });
  });

  it("rejects an invalid volumeProfile", () => {
    const parser = createService();

    expect(() => parser.parseResponse(validResponse("oversized_furniture"))).toThrow(
      ServiceUnavailableException
    );
  });
});
