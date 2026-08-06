import { Test, TestingModule } from "@nestjs/testing";
import { PgEntitiesService } from "./pg-entities.service";

describe("PgEntitiesService", () => {
  let service: PgEntitiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PgEntitiesService],
    }).compile();

    service = module.get<PgEntitiesService>(PgEntitiesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
