import { pool } from '../src/db/pool.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const products = [
  ['Aura Wireless Headphones', 'aura-wireless-headphones', 'Immersive sound with all-day comfort.', 'Northstar', 129, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900'],
  ['Everyday Canvas Backpack', 'everyday-canvas-backpack', 'A durable, considered everyday carry.', 'Field Notes', 78, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900'],
  ['Minimal Ceramic Set', 'minimal-ceramic-set', 'Hand-finished tableware for slow mornings.', 'Forma', 46, 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=900']
];
for (const [name, slug, description, brand, price, imageUrl] of products) {
  const category = await prisma.category.upsert({ where: { slug: slug.includes('head') ? 'electronics' : slug.includes('backpack') ? 'accessories' : 'home-kitchen' }, update: {}, create: { name: slug.includes('head') ? 'Electronics' : slug.includes('backpack') ? 'Accessories' : 'Home & Kitchen', slug: slug.includes('head') ? 'electronics' : slug.includes('backpack') ? 'accessories' : 'home-kitchen' } });
  await prisma.product.upsert({ where: { slug }, update: {}, create: { name, slug, description, brand, price, imageUrl, stockQuantity: 50, rating: 4.8, reviewCount: 42, categoryId: category.id } });
}
await prisma.$disconnect();
await pool.end();
