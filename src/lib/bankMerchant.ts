import { db } from '@/db/db';

const MERCHANT_RULES: Array<{ pattern: RegExp; categoryName: string }> = [
  { pattern: /амpp|гку|парков/i, categoryName: 'Транспорт' },
  { pattern: /qr|sbp|_p_qr/i, categoryName: 'Прочее' },
];

export async function suggestCategoryId(merchant: string): Promise<number | undefined> {
  const categories = await db.categories.toArray();
  for (const rule of MERCHANT_RULES) {
    if (!rule.pattern.test(merchant)) continue;
    const cat = categories.find((c) => c.name === rule.categoryName);
    if (cat?.id) return cat.id;
  }
  const other = categories.find((c) => c.name === 'Прочее');
  return other?.id;
}
