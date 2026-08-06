import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { SensorProcessor } from "./sensor.processor";
import { CostComputationService } from "./services/cost-computation.service";
import { MapNavigationService } from "./services/map-navigation.service";
import { SmartTicketingService } from "./services/smart-ticketing.service";

describe("SensorProcessor", () => {
  let processor: SensorProcessor;
  let tripsModel: any;
  let sensorEventsModel: any;
  let smartTicketingService: any;

  beforeEach(async () => {
    tripsModel = {
      findById: jest.fn(),
      updateOne: jest.fn(),
    };
    sensorEventsModel = {
      create: jest.fn(),
    };
    smartTicketingService = {
      issueTicket: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensorProcessor,
        { provide: getModelToken("Trips"), useValue: tripsModel },
        { provide: getModelToken("SensorEvents"), useValue: sensorEventsModel },
        CostComputationService,
        MapNavigationService,
        { provide: SmartTicketingService, useValue: smartTicketingService },
      ],
    }).compile();

    processor = module.get<SensorProcessor>(SensorProcessor);
  });

  it("should compute eta, persist sensor event, and issue a ticket", async () => {
    const trip = { _id: "507f1f77bcf86cd799439011", user_id: "user-1" };
    tripsModel.findById.mockResolvedValue(trip);
    tripsModel.updateOne.mockResolvedValue({});
    sensorEventsModel.create.mockResolvedValue({});
    smartTicketingService.issueTicket.mockResolvedValue({});

    await processor.processSensorEvent({
      id: "1",
      name: "process-sensor-event",
      data: {
        trip_id: "507f1f77bcf86cd799439011",
        origin: "New York",
        destination: "Boston",
        transport: "Train",
        distance_miles: 215,
        lat: 40.7128,
        lng: -74.006,
      },
    } as any);

    // ETA: 215 / 100 mph = 2.15h => "2h 9m"
    expect(tripsModel.updateOne).toHaveBeenCalledWith(
      { _id: "507f1f77bcf86cd799439011" },
      { $set: { eta: "2h 9m" } },
    );
    expect(sensorEventsModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        trip_id: "507f1f77bcf86cd799439011",
        location: { lat: 40.7128, lng: -74.006 },
      }),
    );
    // Cost: 215 * 0.25 = 53.75
    expect(smartTicketingService.issueTicket).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      "user-1",
      53.75,
    );
  });

  it("should skip ticketing when the trip does not exist", async () => {
    tripsModel.findById.mockResolvedValue(null);
    sensorEventsModel.create.mockResolvedValue({});

    await processor.processSensorEvent({
      id: "2",
      name: "process-sensor-event",
      data: {
        trip_id: "507f1f77bcf86cd799439011",
        origin: "New York",
        destination: "Boston",
        transport: "Car",
        distance_miles: 50,
      },
    } as any);

    expect(smartTicketingService.issueTicket).not.toHaveBeenCalled();
    expect(tripsModel.updateOne).not.toHaveBeenCalled();
    expect(sensorEventsModel.create).toHaveBeenCalledTimes(1);
  });

  it("should ignore unknown transport types", async () => {
    await processor.processSensorEvent({
      id: "3",
      name: "process-sensor-event",
      data: {
        trip_id: "507f1f77bcf86cd799439011",
        origin: "New York",
        destination: "Boston",
        transport: "Teleport",
        distance_miles: 50,
      },
    } as any);

    expect(sensorEventsModel.create).not.toHaveBeenCalled();
    expect(smartTicketingService.issueTicket).not.toHaveBeenCalled();
  });
});
