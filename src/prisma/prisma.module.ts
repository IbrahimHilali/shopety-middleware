import {Global, Module} from '@nestjs/common';
import {PrismaService} from './prisma.service';

@Global() // optional: makes PrismaService visible everywhere without repeated imports
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule {
}