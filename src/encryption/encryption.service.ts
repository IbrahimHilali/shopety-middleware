// encryption.service.ts
import {Injectable} from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
    private readonly algorithm = 'aes-256-ctr';
    private readonly key = crypto.randomBytes(32);
    private readonly iv = crypto.randomBytes(16);


    encrypt(text: string): string {
        const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
        const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
        return `${this.iv.toString('hex')}:${encrypted.toString('hex')}`;
    }

    decrypt(hash: string): string {
        const [iv, content] = hash.split(':');
        const decipher = crypto.createDecipheriv(
            this.algorithm,
            this.key,
            Buffer.from(iv, 'hex'),
        );
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(content, 'hex')),
            decipher.final(),
        ]);
        return decrypted.toString();
    }
}
