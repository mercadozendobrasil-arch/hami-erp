"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        rawBody: true,
    });
    app.enableCors({
        origin: true,
        credentials: false,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidUnknownValues: false,
    }));
    const port = Number(process.env.PORT || 3001);
    await app.listen(port);
}
bootstrap();
//# sourceMappingURL=main.js.map