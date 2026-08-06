import { Test, TestingModule } from "@nestjs/testing";
import { InjestionController } from "./injestion.controller";
import { InjestionService } from "./injestion.service";
import { IngestSensorDataDto } from "./dto/ingest-sensor-data.dto";

describe("InjestionController", () => {
  let injestionController: InjestionController;
  let injestionService: InjestionService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [InjestionController],
      providers: [
        {
          provide: InjestionService,
          useValue: {
            ingest: jest.fn().mockResolvedValue({
              successful: true,
              message: "Sensor events queued for processing",
              data: { queued: 1, jobIds: ["1"] },
            }),
          },
        },
      ],
    }).compile();

    injestionController = app.get<InjestionController>(InjestionController);
    injestionService = app.get<InjestionService>(InjestionService);
  });

  it("should be defined", () => {
    expect(injestionController).toBeDefined();
  });

  it("should queue sensor events", async () => {
    const dto: IngestSensorDataDto = {
      events: [
        {
          trip_id: "507f1f77bcf86cd799439011",
          origin: "New York",
          destination: "Boston",
          transport: "Train",
          distance_miles: 215,
        },
      ],
    };

    const result = await injestionController.ingest(dto);
    expect(injestionService.ingest).toHaveBeenCalledWith(dto);
    expect(result.data.queued).toBe(1);
  });
});
