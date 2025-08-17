import {Test, TestingModule} from '@nestjs/testing';
import {ZaincashController} from './zaincash.controller';

describe('ZaincashController', () => {
    let controller: ZaincashController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ZaincashController],
        }).compile();

        controller = module.get<ZaincashController>(ZaincashController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
