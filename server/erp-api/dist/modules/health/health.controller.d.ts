import { HealthService } from './health.service';
export declare class HealthController {
    private readonly healthService;
    constructor(healthService: HealthService);
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
