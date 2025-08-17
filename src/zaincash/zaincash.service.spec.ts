import {Test, TestingModule} from '@nestjs/testing';
import {ZaincashService} from './zaincash.service';

describe('ZaincashService', () => {
    let service: ZaincashService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ZaincashService],
        }).compile();

        service = module.get<ZaincashService>(ZaincashService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
