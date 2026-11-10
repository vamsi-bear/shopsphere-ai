import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { z } from 'zod';
import { checkDatabase } from './db/pool.js';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'development-only-secret';
const authSchema = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(2).max(80).optional() });
const idSchema = z.string().min(1);

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true }));

function tokenFor(user) { return jwt.sign({ sub: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' }); }
function publicUser(user) { return { id: user.id, name: user.name, email: user.email, role: user.role }; }
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication required' });
  try { req.user = jwt.verify(header.slice(7), JWT_SECRET); next(); } catch { return res.status(401).json({ message: 'Invalid or expired session' }); }
}
function requireAdmin(req, res, next) { if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Administrator access required' }); next(); }
function parseId(req, res) { const result = idSchema.safeParse(req.params.id); if (!result.success) { res.status(400).json({ message: 'Invalid identifier' }); return null; } return result.data; }

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'shopsphere-api' }));
app.get('/api/health/db', async (_req, res) => {
  try {
    const database = await checkDatabase();
    res.json({ status: 'ok', database: database.database, serverTime: database.server_time });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const input = authSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (exists) return res.status(409).json({ message: 'An account already exists for that email' });
    const user = await prisma.user.create({ data: { email: input.email.toLowerCase(), name: input.name || input.email.split('@')[0], passwordHash: await bcrypt.hash(input.password, 12) } });
    res.status(201).json({ user: publicUser(user), token: tokenFor(user) });
  } catch (error) { next(error); }
});
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const input = authSchema.pick({ email: true, password: true }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect' });
    res.json({ user: publicUser(user), token: tokenFor(user) });
  } catch (error) { next(error); }
});
app.get('/api/auth/me', requireAuth, async (req, res, next) => { try { const user = await prisma.user.findUnique({ where: { id: req.user.sub } }); if (!user) return res.status(404).json({ message: 'Account not found' }); res.json({ user: publicUser(user) }); } catch (error) { next(error); } });

app.get('/api/categories', async (_req, res, next) => { try { res.json(await prisma.category.findMany({ orderBy: { name: 'asc' } })); } catch (error) { next(error); } });
app.get('/api/products', async (req, res, next) => {
  try {
    const { search, category, minPrice, maxPrice, sort = 'newest', page = '1', limit = '24' } = req.query;
    const take = Math.min(Math.max(Number(limit) || 24, 1), 100); const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
    const where = { ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { brand: { contains: search, mode: 'insensitive' } }] } : {}), ...(category ? { category: { name: { equals: category, mode: 'insensitive' } } } : {}), ...(minPrice || maxPrice ? { price: { ...(minPrice ? { gte: Number(minPrice) } : {}), ...(maxPrice ? { lte: Number(maxPrice) } : {}) } } : {}) };
    const orderBy = sort === 'price_asc' ? { price: 'asc' } : sort === 'price_desc' ? { price: 'desc' } : sort === 'popular' ? { reviewCount: 'desc' } : { createdAt: 'desc' };
    const [products, total] = await prisma.$transaction([prisma.product.findMany({ where, include: { category: true }, take, skip, orderBy }), prisma.product.count({ where })]);
    res.json({ products, total, page: Math.floor(skip / take) + 1, pages: Math.ceil(total / take) });
  } catch (error) { next(error); }
});
app.get('/api/products/:id', async (req, res, next) => { try { const id = parseId(req, res); if (!id) return; const product = await prisma.product.findUnique({ where: { id }, include: { category: true, reviews: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } } } }); if (!product) return res.status(404).json({ message: 'Product not found' }); res.json(product); } catch (error) { next(error); } });
app.post('/api/products/:id/reviews', requireAuth, async (req, res, next) => { try { const id = parseId(req, res); if (!id) return; const input = z.object({ rating: z.number().int().min(1).max(5), body: z.string().min(2).max(1000) }).parse(req.body); const review = await prisma.productReview.create({ data: { ...input, productId: id, userId: req.user.sub } }); const aggregate = await prisma.productReview.aggregate({ where: { productId: id }, _avg: { rating: true }, _count: true }); await prisma.product.update({ where: { id }, data: { rating: aggregate._avg.rating || 0, reviewCount: aggregate._count } }); res.status(201).json(review); } catch (error) { next(error); } });

async function cartFor(userId) { return prisma.cart.upsert({ where: { userId }, create: { userId }, update: {}, include: { items: { include: { product: true } } } }); }
app.get('/api/cart', requireAuth, async (req, res, next) => { try { res.json(await cartFor(req.user.sub)); } catch (error) { next(error); } });
app.post('/api/cart/items', requireAuth, async (req, res, next) => { try { const input = z.object({ productId: z.string(), quantity: z.number().int().min(1).max(99) }).parse(req.body); const product = await prisma.product.findUnique({ where: { id: input.productId } }); if (!product || product.stockQuantity < input.quantity) return res.status(400).json({ message: 'Product is unavailable in that quantity' }); const cart = await cartFor(req.user.sub); const item = await prisma.cartItem.upsert({ where: { cartId_productId: { cartId: cart.id, productId: input.productId } }, create: { cartId: cart.id, productId: input.productId, quantity: input.quantity }, update: { quantity: { increment: input.quantity } }, include: { product: true } }); res.status(201).json(item); } catch (error) { next(error); } });
app.delete('/api/cart/items/:id', requireAuth, async (req, res, next) => { try { const id = parseId(req, res); if (!id) return; await prisma.cartItem.deleteMany({ where: { id, cart: { userId: req.user.sub } } }); res.status(204).end(); } catch (error) { next(error); } });

app.get('/api/wishlist', requireAuth, async (req, res, next) => { try { const wishlist = await prisma.wishlist.findUnique({ where: { userId: req.user.sub }, include: { items: { include: { product: { include: { category: true } } } } } }); res.json(wishlist || { items: [] }); } catch (error) { next(error); } });
app.post('/api/wishlist', requireAuth, async (req, res, next) => { try { const input = z.object({ productId: z.string() }).parse(req.body); const wishlist = await prisma.wishlist.upsert({ where: { userId: req.user.sub }, create: { userId: req.user.sub }, update: {} }); const item = await prisma.wishlistItem.upsert({ where: { wishlistId_productId: { wishlistId: wishlist.id, productId: input.productId } }, create: { wishlistId: wishlist.id, productId: input.productId }, update: {} }); res.status(201).json(item); } catch (error) { next(error); } });
app.delete('/api/wishlist/:productId', requireAuth, async (req, res, next) => { try { await prisma.wishlistItem.deleteMany({ where: { productId: req.params.productId, wishlist: { userId: req.user.sub } } }); res.status(204).end(); } catch (error) { next(error); } });

app.post('/api/orders', requireAuth, async (req, res, next) => {
  try {
    const input = z.object({ items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(99) })).min(1), shipping: z.number().min(0).max(100) }).parse(req.body);
    const order = await prisma.$transaction(async tx => {
      let subtotal = 0; const lines = [];
      for (const item of input.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.stockQuantity < item.quantity) throw Object.assign(new Error('A product is out of stock'), { status: 400 });
        const updated = await tx.product.updateMany({ where: { id: product.id, stockQuantity: { gte: item.quantity } }, data: { stockQuantity: { decrement: item.quantity } } });
        if (updated.count !== 1) throw Object.assign(new Error('A product became unavailable during checkout'), { status: 409 });
        subtotal += Number(product.price) * item.quantity;
        lines.push({ productId: product.id, quantity: item.quantity, unitPrice: product.price });
      }
      const order = await tx.order.create({ data: { userId: req.user.sub, subtotal, shipping: input.shipping, total: subtotal + input.shipping, items: { create: lines } }, include: { items: { include: { product: true } } } });
      await tx.cartItem.deleteMany({ where: { cart: { userId: req.user.sub } } });
      return order;
    });
    res.status(201).json(order);
  } catch (error) { next(error); }
});
app.get('/api/orders', requireAuth, async (req, res, next) => { try { res.json(await prisma.order.findMany({ where: { userId: req.user.sub }, include: { items: { include: { product: true } }, payments: true }, orderBy: { createdAt: 'desc' } })); } catch (error) { next(error); } });
app.get('/api/orders/:id', requireAuth, async (req, res, next) => { try { const id = parseId(req, res); if (!id) return; const order = await prisma.order.findFirst({ where: { id, userId: req.user.sub }, include: { items: { include: { product: true } }, payments: true } }); if (!order) return res.status(404).json({ message: 'Order not found' }); res.json(order); } catch (error) { next(error); } });
app.patch('/api/orders/:id/cancel', requireAuth, async (req, res, next) => { try { const id = parseId(req, res); if (!id) return; const order = await prisma.order.findFirst({ where: { id, userId: req.user.sub } }); if (!order || !['PENDING', 'CONFIRMED'].includes(order.status)) return res.status(400).json({ message: 'This order can no longer be cancelled' }); res.json(await prisma.order.update({ where: { id }, data: { status: 'CANCELLED' } })); } catch (error) { next(error); } });
app.post('/api/payments/create-order', requireAuth, async (req, res, next) => { try { const input = z.object({ orderId: z.string() }).parse(req.body); const order = await prisma.order.findFirst({ where: { id: input.orderId, userId: req.user.sub } }); if (!order) return res.status(404).json({ message: 'Order not found' }); const providerOrderId = `test_${order.id}`; const payment = await prisma.payment.upsert({ where: { providerOrderId }, create: { provider: 'razorpay', providerOrderId, amount: order.total, status: 'created', orderId: order.id }, update: { amount: order.total } }); res.json({ payment, keyId: process.env.RAZORPAY_KEY_ID || null }); } catch (error) { next(error); } });
app.post('/api/payments/verify', requireAuth, async (req, res, next) => { try { const input = z.object({ orderId: z.string(), razorpayOrderId: z.string(), razorpayPaymentId: z.string(), razorpaySignature: z.string() }).parse(req.body); const payment = await prisma.payment.findFirst({ where: { providerOrderId: input.razorpayOrderId, orderId: input.orderId, order: { userId: req.user.sub } } }); if (!payment) return res.status(404).json({ message: 'Payment order not found' }); if (payment.status === 'paid') return res.json(payment); const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '').update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`).digest('hex'); const expectedBuffer = Buffer.from(expected); const signatureBuffer = Buffer.from(input.razorpaySignature); if (!process.env.RAZORPAY_KEY_SECRET || expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) return res.status(400).json({ message: 'Payment signature verification failed' }); const verified = await prisma.payment.update({ where: { id: payment.id }, data: { providerPaymentId: input.razorpayPaymentId, status: 'paid' } }); await prisma.order.update({ where: { id: input.orderId }, data: { status: 'CONFIRMED' } }); res.json(verified); } catch (error) { next(error); } });

app.get('/api/admin/dashboard', requireAuth, requireAdmin, async (_req, res, next) => { try { const [users, products, orders, revenue] = await Promise.all([prisma.user.count(), prisma.product.count(), prisma.order.count(), prisma.order.aggregate({ _sum: { total: true } })]); res.json({ users, products, orders, revenue: revenue._sum.total || 0 }); } catch (error) { next(error); } });
app.patch('/api/admin/orders/:id/status', requireAuth, requireAdmin, async (req, res, next) => { try { const status = z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED']).parse(req.body.status); res.json(await prisma.order.update({ where: { id: req.params.id }, data: { status } })); } catch (error) { next(error); } });

app.use((error, _req, res, _next) => { console.error(error); res.status(error.status || (error.name === 'ZodError' ? 400 : 500)).json({ message: error.name === 'ZodError' ? 'Invalid request data' : error.message || 'Unable to complete request' }); });
const port = Number(process.env.PORT || 4000);
const server = app.listen(port, () => console.log(`ShopSphere API listening on ${port}`));
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the existing API process or set a different PORT in backend/.env.`);
    process.exitCode = 1;
    return;
  }
  console.error('Unable to start ShopSphere API:', error);
  process.exitCode = 1;
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down ShopSphere API.`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
