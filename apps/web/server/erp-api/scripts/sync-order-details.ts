import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ShopeeService } from '../src/modules/shopee/shopee.service';

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  for (const item of argv) {
    if (!item.startsWith('--')) {
      continue;
    }
    const [key, value] = item.slice(2).split('=');
    args.set(key, value || 'true');
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const shopeeService = app.get(ShopeeService);
    const orderNo = args.get('orderNo');
    const shopId = args.get('shopId');
    const days = Number(args.get('days') || 7);
    const limit = Number(args.get('limit') || 50);

    const result = orderNo
      ? await shopeeService.syncOrderDetails({
          orderNo,
          shopId,
        })
      : await shopeeService.syncRecentOrderDetails({
          shopId,
          days,
          limit,
        });

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
