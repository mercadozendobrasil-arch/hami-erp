import { PrismaService } from '../database/prisma.service';
export declare class HealthService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    check(): Promise<{
        success: boolean;
        status: string;
        service: string;
        timestamp: string;
        database: {
            status: string;
            message?: undefined;
        };
    } | {
        success: boolean;
        status: string;
        service: string;
        timestamp: string;
        database: {
            status: string;
            message: string;
        };
    }>;
}
