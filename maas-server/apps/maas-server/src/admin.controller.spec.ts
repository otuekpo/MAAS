import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { Trips } from "@app/database/mongodb";
import { User } from "@app/database/pg-entities";
import { UserRole } from "@app/shared";
import { JwtAuthGuard } from "@app/shared/guards";
import { RoleGuard } from "@app/shared/guards/role.guard";
import { Reflector } from "@nestjs/core";

describe("AdminController", () => {
  let controller: AdminController;
  let service: AdminService;

  const mockTripsModel = {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockResolvedValue([
      {
        user_id: "user-1",
        route: "New York to Boston",
        transport: "Train",
        date: "2026-08-01",
        cost: "32.25",
        eta: "2h 9m",
        toObject: function () {
          return {
            user_id: this.user_id,
            route: this.route,
            transport: this.transport,
            date: this.date,
            cost: this.cost,
            eta: this.eta,
          };
        },
      },
    ]),
  };

  const mockUserRepo = {
    find: jest.fn().mockResolvedValue([
      {
        id: "user-1",
        email: "alice@mailinator.com",
        firstName: "Alice",
        lastName: "B",
      },
    ]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        AdminService,
        { provide: getModelToken(Trips.name), useValue: mockTripsModel },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RoleGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get<AdminService>(AdminService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe("GET /admin/trips", () => {
    it("returns all trips joined with their user", async () => {
      const result = await controller.getAllTrips();

      expect(result.successful).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].user.email).toBe("alice@mailinator.com");
      expect(result.data[0].route).toBe("New York to Boston");
      expect(mockTripsModel.find).toHaveBeenCalled();
      expect(mockUserRepo.find).toHaveBeenCalled();
    });
  });

  describe("role metadata", () => {
    it("is restricted to ADMIN_OFFICER and SUPERADMIN roles", () => {
      const reflector = new Reflector();
      const roles = reflector.getAllAndOverride<string[]>("ROLE", [
        AdminController,
      ]);
      expect(roles).toContain(UserRole.ADMIN_OFFICER);
      expect(roles).toContain(UserRole.SUPERADMIN);
    });
  });
});
