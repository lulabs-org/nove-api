import { PrismaClient, Product, User, Channel } from '@prisma/client';
import { CreateOrdersParams, OrderConfig } from './type';
import { ORDER_CONFIGS } from './config';

const MIN_PRODUCTS = 6;
const MIN_CHANNELS = 6;
const MIN_NORMAL_USERS = 5;

function generateOrderCode(index: number): string {
  const timestamp = Date.now().toString().slice(-8);
  return `ORD${timestamp}${index.toString().padStart(3, '0')}`;
}

function generateOrderNumber(index: number): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const timestamp = Date.now().toString().slice(-6);
  return `${date}${timestamp}${index.toString().padStart(3, '0')}`;
}

function calculateBenefitDaysRemaining(
  activeDays: number,
  benefitDurationDays: number,
): number {
  return benefitDurationDays - activeDays;
}

function validateParams(params: CreateOrdersParams): void {
  const { products, channels, users } = params;
  const { normalUsers } = users;

  if (!products || products.length === 0) {
    throw new Error('Products array is empty or undefined');
  }

  if (products.length < MIN_PRODUCTS) {
    throw new Error(
      `Expected at least ${MIN_PRODUCTS} products, but got ${products.length}`,
    );
  }

  if (!channels || channels.length === 0) {
    throw new Error('Channels array is empty or undefined');
  }

  if (channels.length < MIN_CHANNELS) {
    throw new Error(
      `Expected at least ${MIN_CHANNELS} channels, but got ${channels.length}`,
    );
  }

  if (!normalUsers || normalUsers.length === 0) {
    throw new Error('Normal users array is empty or undefined');
  }

  if (normalUsers.length < MIN_NORMAL_USERS) {
    throw new Error(
      `Expected at least ${MIN_NORMAL_USERS} normal users, but got ${normalUsers.length}`,
    );
  }
}

function getOrderUser(
  config: OrderConfig,
  normalUsers: User[],
): { user: User | null; customerEmail: string | null } {
  const user = config.userIndex >= 0 ? normalUsers[config.userIndex] : null;
  const customerEmail = config.customerEmail ?? user?.email ?? null;

  return { user, customerEmail };
}

function validateOrderResources(
  product: Product | undefined,
  channel: Channel | undefined,
  productIndex: number,
  channelIndex: number,
): void {
  if (!product) {
    throw new Error(`Product at index ${productIndex} not found`);
  }

  if (!channel) {
    throw new Error(`Channel at index ${channelIndex} not found`);
  }
}

function createOrderData(
  config: OrderConfig,
  index: number,
  product: Product,
  channel: Channel,
  user: User | null,
  customerEmail: string | null,
  financeUserId: string,
  adminUserId: string,
) {
  return {
    orderCode: generateOrderCode(index + 1),
    orderNumber: generateOrderNumber(index + 1),
    externalOrderId: config.externalOrderId,
    productId: product.id,
    productName: product.name,
    customerEmail,
    userId: user ? user.id : null,
    channelId: channel.id,
    currentOwnerId: financeUserId,
    financialCloserId: config.financialClosed ? adminUserId : null,
    financialClosedAt: config.financialClosedAt
      ? new Date(config.financialClosedAt)
      : null,
    financialClosed: config.financialClosed,
    amount: config.amount,
    currency: config.currency,
    amountCny: config.amountCny ?? config.amount,
    paidAt: new Date(config.paidAt),
    effectiveDate: new Date(config.effectiveDate),
    benefitStartDate: new Date(config.effectiveDate),
    benefitDurationDays: config.benefitDurationDays,
    activeDays: config.activeDays,
    benefitDaysRemaining: calculateBenefitDaysRemaining(
      config.activeDays,
      config.benefitDurationDays,
    ),
  };
}

export async function createOrders(
  prisma: PrismaClient,
  params: CreateOrdersParams,
) {
  validateParams(params);

  const { users, products, channels } = params;
  const { adminUser, financeUser, normalUsers } = users;

  const orders = await Promise.all(
    ORDER_CONFIGS.map((config, index) => {
      const product = products[config.productIndex];
      const channel = channels[config.channelIndex];

      validateOrderResources(
        product,
        channel,
        config.productIndex,
        config.channelIndex,
      );

      const { user, customerEmail } = getOrderUser(config, normalUsers);

      const orderData = createOrderData(
        config,
        index,
        product,
        channel,
        user,
        customerEmail,
        financeUser.id,
        adminUser.id,
      );

      return prisma.order.create({ data: orderData });
    }),
  );

  return orders;
}
