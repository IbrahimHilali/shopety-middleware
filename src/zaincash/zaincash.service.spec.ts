import {Test, TestingModule} from '@nestjs/testing';
import {ZainCashService} from './zaincash.service';

describe('ZaincashService', () => {
    let service: ZainCashService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ZainCashService],
        }).compile();

        service = module.get<ZainCashService>(ZainCashService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
