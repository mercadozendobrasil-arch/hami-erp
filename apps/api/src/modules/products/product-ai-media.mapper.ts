const taskTypeMap: Record<string, string> = {
  poster_batch: 'POSTER_BATCH',
  main_image_optimize: 'MAIN_IMAGE_OPTIMIZE',
  scene_image: 'SCENE_IMAGE',
  detail_content_image: 'DETAIL_CONTENT_IMAGE',
  full_edit: 'FULL_EDIT',
  partial_edit: 'PARTIAL_EDIT',
};

const mediaTypeMap: Record<string, string> = {
  image: 'IMAGE',
  video: 'VIDEO',
  attachment: 'ATTACHMENT',
};

const sourceTypeMap: Record<string, string> = {
  original: 'ORIGINAL',
  product: 'PRODUCT',
  sku: 'SKU',
  ai: 'AI',
};

const usageTypeMap: Record<string, string> = {
  product_main: 'PRODUCT_MAIN',
  product_detail: 'PRODUCT_DETAIL',
  marketing_material: 'MARKETING_MATERIAL',
  channel_publish: 'CHANNEL_PUBLISH',
};

export function toPrismaTaskType(value: string) {
  return taskTypeMap[value] ?? value;
}

export function toPrismaMediaType(value: string) {
  return mediaTypeMap[value] ?? value;
}

export function toPrismaSourceType(value?: string) {
  return sourceTypeMap[value ?? 'original'];
}

export function toPrismaUsageType(value: string) {
  return usageTypeMap[value] ?? value;
}

export function inferAssetType(taskType: string) {
  const normalized = taskType.toLowerCase();
  if (normalized === 'main_image_optimize') return 'MAIN_IMAGE';
  if (normalized === 'scene_image') return 'SCENE_IMAGE';
  if (normalized === 'detail_content_image') return 'DETAIL_IMAGE';
  return 'POSTER';
}

export function buildProductAiTaskNo() {
  return `PAI${Date.now()}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')}`;
}

export function buildPrompt(input: {
  taskType: string;
  stylePreference?: string;
  bizGoal?: string;
  extraPrompt?: string;
}) {
  return [
    `task_type=${input.taskType}`,
    input.stylePreference ? `style=${input.stylePreference}` : undefined,
    input.bizGoal ? `goal=${input.bizGoal}` : undefined,
    input.extraPrompt ? `extra=${input.extraPrompt}` : undefined,
  ]
    .filter(Boolean)
    .join('\n');
}
