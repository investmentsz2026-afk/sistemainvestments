"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const quality_controller_1 = require("./quality.controller");
describe('QualityController', () => {
    let controller;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            controllers: [quality_controller_1.QualityController],
        }).compile();
        controller = module.get(quality_controller_1.QualityController);
    });
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
