"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const quality_service_1 = require("./quality.service");
describe('QualityService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [quality_service_1.QualityService],
        }).compile();
        service = module.get(quality_service_1.QualityService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
