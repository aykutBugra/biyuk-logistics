import { ShapeBasedVolumeCalculatorService } from "../src/modules/volume-estimation/shape-based-volume-calculator.service";
import type {
  VolumeAnalysisItem,
  VolumeAnalysisResult,
} from "../src/modules/volume-estimation/volume-estimation.types";

function createItem(overrides: Partial<VolumeAnalysisItem>): VolumeAnalysisItem {
  return {
    label: "Yuk",
    loadType: "genel_yuk",
    shapeType: "box",
    sizeClass: "medium",
    volumeProfile: "mixed_unknown",
    estimatedCount: 1,
    stackable: false,
    confidence: "high",
    fragile: false,
    disassemblable: false,
    spaceProfile: "compact",
    placementRisk: "low",
    notes: "",
    ...overrides,
  };
}

function createAnalysis(items: VolumeAnalysisItem[]): VolumeAnalysisResult {
  return {
    items,
    overallConfidence: "high",
    warnings: [],
  };
}

describe("ShapeBasedVolumeCalculatorService", () => {
  let service: ShapeBasedVolumeCalculatorService;

  beforeEach(() => {
    service = new ShapeBasedVolumeCalculatorService();
  });

  it("keeps a sofa, bookcase and desk estimate in the expected IKEA-like range", () => {
    const result = service.calculate(
      createAnalysis([
        createItem({
          label: "2li kanepe",
          loadType: "mobilya",
          volumeProfile: "sofa",
          sizeClass: "medium",
          spaceProfile: "bulky",
        }),
        createItem({
          label: "dar kitaplik",
          loadType: "mobilya",
          volumeProfile: "shelf_bookcase",
          sizeClass: "large",
          spaceProfile: "tall",
        }),
        createItem({
          label: "calisma masasi",
          loadType: "mobilya",
          volumeProfile: "desk_table",
          shapeType: "flat",
          sizeClass: "large",
          spaceProfile: "wide",
        }),
      ])
    );

    expect(result.recommendedHacimM3).toBeGreaterThanOrEqual(1.5);
    expect(result.recommendedHacimM3).toBeLessThanOrEqual(2.5);
    expect(result.recommendedHacimM3).toBeLessThan(5);
  });

  it("preserves calibrated appliance and sofa bands through volume profiles", () => {
    const result = service.calculate(
      createAnalysis([
        createItem({
          label: "buzdolabi",
          loadType: "beyaz_esya",
          volumeProfile: "appliance",
          sizeClass: "large",
          spaceProfile: "tall",
        }),
        createItem({
          label: "camasir makinesi",
          loadType: "beyaz_esya",
          volumeProfile: "appliance",
          sizeClass: "medium",
          spaceProfile: "compact",
        }),
        createItem({
          label: "L koltuk",
          loadType: "mobilya",
          volumeProfile: "sofa",
          sizeClass: "huge",
          spaceProfile: "bulky",
        }),
        createItem({
          label: "3lu koltuk",
          loadType: "mobilya",
          volumeProfile: "sofa",
          sizeClass: "large",
          spaceProfile: "bulky",
        }),
      ])
    );

    expect(result.recommendedHacimM3).toBeGreaterThanOrEqual(5.2);
    expect(result.recommendedHacimM3).toBeLessThanOrEqual(5.5);
    expect(result.minHacimM3).toBeGreaterThanOrEqual(4.2);
    expect(result.maxHacimM3).toBeLessThanOrEqual(6.4);
  });

  it("multiplies repeated box and crate loads without inflating them as furniture", () => {
    const result = service.calculate(
      createAnalysis([
        createItem({
          label: "meyve kasasi",
          loadType: "koli",
          volumeProfile: "box_crate",
          sizeClass: "medium",
          estimatedCount: 10,
          stackable: true,
          spaceProfile: "compact",
        }),
      ])
    );

    expect(result.recommendedHacimM3).toBeGreaterThanOrEqual(0.8);
    expect(result.recommendedHacimM3).toBeLessThanOrEqual(1.2);
  });

  it("uses aggregate profiles for room and household loads", () => {
    const roomResult = service.calculate(
      createAnalysis([
        createItem({
          label: "tek oda esyasi",
          volumeProfile: "room_load",
          sizeClass: "medium",
          spaceProfile: "mixed",
        }),
      ])
    );
    const householdResult = service.calculate(
      createAnalysis([
        createItem({
          label: "kucuk ev esyasi",
          volumeProfile: "household_load",
          sizeClass: "small",
          spaceProfile: "mixed",
        }),
      ])
    );

    expect(roomResult.recommendedHacimM3).toBeGreaterThanOrEqual(5);
    expect(roomResult.recommendedHacimM3).toBeLessThanOrEqual(7);
    expect(householdResult.recommendedHacimM3).toBeGreaterThanOrEqual(10);
    expect(householdResult.recommendedHacimM3).toBeLessThanOrEqual(14);
  });

  it("lowers confidence and widens the range for mixed unknown loads", () => {
    const result = service.calculate(
      createAnalysis([
        createItem({
          label: "belirsiz yuk",
          volumeProfile: "mixed_unknown",
          shapeType: "unknown",
          confidence: "low",
          sizeClass: "medium",
          spaceProfile: "mixed",
        }),
      ])
    );

    expect(result.backendConfidence).toBe("low");
    expect(result.maxHacimM3 - result.minHacimM3).toBeGreaterThan(1);
  });
});
