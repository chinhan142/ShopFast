var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// backend/prisma/seed.ts
var import_client = require("@prisma/client");
var bcrypt = __toESM(require("bcrypt"));
var prisma = new import_client.PrismaClient();
async function main() {
  console.log("\u{1F331} Starting database seeding for ShopFast...");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  const passwordSalt = 10;
  const adminPassword = await bcrypt.hash("Admin@123456", passwordSalt);
  const staffPassword = await bcrypt.hash("Staff@123456", passwordSalt);
  const customerPassword = await bcrypt.hash("Customer@123456", passwordSalt);
  const admin = await prisma.user.create({
    data: {
      email: "admin@shopfast.vn",
      password: adminPassword,
      fullName: "Qu\u1EA3n Tr\u1ECB Vi\xEAn ShopFast",
      phone: "0901111222",
      role: import_client.Role.ADMIN
    }
  });
  const staff = await prisma.user.create({
    data: {
      email: "warehouse@shopfast.vn",
      password: staffPassword,
      fullName: "Tr\u1EA7n V\u0103n Kho (Staff)",
      phone: "0903333444",
      role: import_client.Role.STAFF
    }
  });
  const customer = await prisma.user.create({
    data: {
      email: "customer@shopfast.vn",
      password: customerPassword,
      fullName: "L\xEA Ho\xE0ng Kh\xE1ch H\xE0ng",
      phone: "0905555666",
      role: import_client.Role.CUSTOMER
    }
  });
  console.log("\u2705 Seeded 3 system users (Admin, Warehouse Staff, Customer).");
  const catPhones = await prisma.category.create({
    data: {
      name: "\u0110i\u1EC7n tho\u1EA1i & Tablet",
      slug: "dien-thoai-tablet",
      description: "Smartphone v\xE0 m\xE1y t\xEDnh b\u1EA3ng ch\xEDnh h\xE3ng cao c\u1EA5p"
    }
  });
  const catLaptops = await prisma.category.create({
    data: {
      name: "Laptop & Ph\u1EE5 ki\u1EC7n",
      slug: "laptop-phu-kien",
      description: "Laptop v\u0103n ph\xF2ng, gaming v\xE0 thi\u1EBFt b\u1ECB ngo\u1EA1i vi"
    }
  });
  const catAudio = await prisma.category.create({
    data: {
      name: "\xC2m thanh & Tai nghe",
      slug: "am-thanh-tai-nghe",
      description: "Tai nghe ch\u1ED1ng \u1ED3n, loa bluetooth cao c\u1EA5p"
    }
  });
  const catSmartHome = await prisma.category.create({
    data: {
      name: "Gia d\u1EE5ng th\xF4ng minh",
      slug: "gia-dung-thong-minh",
      description: "Robot h\xFAt b\u1EE5i, m\xE1y l\u1ECDc kh\xF4ng kh\xED v\xE0 smart home"
    }
  });
  console.log("\u2705 Seeded 4 product categories.");
  const productsData = [
    // Phones
    {
      sku: "IP16-PM-256",
      name: "iPhone 16 Pro Max 256GB Titan Sa M\u1EA1c",
      slug: "iphone-16-pro-max-256gb",
      description: "Chip A18 Pro m\u1EA1nh m\u1EBD, camera 48MP Fusion \u0111i\u1EC1u khi\u1EC3n camera th\u1EBF h\u1EC7 m\u1EDBi.",
      price: 3449e4,
      stock: 35,
      brand: "Apple",
      imageUrl: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80",
      categoryId: catPhones.id
    },
    {
      sku: "SS-S24U-256",
      name: "Samsung Galaxy S24 Ultra 12GB/256GB",
      slug: "samsung-galaxy-s24-ultra",
      description: "Galaxy AI \u0111\u1EC9nh cao, b\xFAt S-Pen t\xEDch h\u1EE3p, khung vi\u1EC1n Titan si\xEAu b\u1EC1n.",
      price: 2799e4,
      stock: 40,
      brand: "Samsung",
      imageUrl: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&auto=format&fit=crop&q=80",
      categoryId: catPhones.id
    },
    {
      sku: "IP15-128",
      name: "iPhone 15 128GB Xanh Pastel",
      slug: "iphone-15-128gb",
      description: "Dynamic Island, camera 48MP, c\u1ED5ng s\u1EA1c USB-C ti\u1EC7n l\u1EE3i.",
      price: 1899e4,
      stock: 25,
      brand: "Apple",
      imageUrl: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80",
      categoryId: catPhones.id
    },
    {
      sku: "XM-14-512",
      name: "Xiaomi 14 5G 12GB/512GB Leica",
      slug: "xiaomi-14-5g-512gb",
      description: "\u1ED0ng k\xEDnh quang h\u1ECDc Leica Summilux, s\u1EA1c nhanh HyperCharge 90W.",
      price: 1949e4,
      stock: 18,
      brand: "Xiaomi",
      imageUrl: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80",
      categoryId: catPhones.id
    },
    // Laptops
    {
      sku: "MBA-M3-16",
      name: "MacBook Air 13 inch M3 (16GB RAM / 256GB SSD)",
      slug: "macbook-air-13-m3-16gb",
      description: "Si\xEAu m\u1ECFng nh\u1EB9 1.24kg, pin l\xEAn \u0111\u1EBFn 18 ti\u1EBFng, m\xE0n h\xECnh Liquid Retina tuy\u1EC7t \u0111\u1EB9p.",
      price: 2949e4,
      stock: 20,
      brand: "Apple",
      imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80",
      categoryId: catLaptops.id
    },
    {
      sku: "MBP-M3P-512",
      name: "MacBook Pro 14 inch M3 Pro (18GB RAM / 512GB SSD)",
      slug: "macbook-pro-14-m3-pro",
      description: "M\xE0n h\xECnh XDR 120Hz ProMotion, qu\u1EA1t l\xE0m m\xE1t ch\u1EE7 \u0111\u1ED9ng hi\u1EC7u n\u0103ng t\u1ED1i \u0111a.",
      price: 4899e4,
      stock: 12,
      brand: "Apple",
      imageUrl: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&auto=format&fit=crop&q=80",
      categoryId: catLaptops.id
    },
    {
      sku: "DELL-XPS-13",
      name: "Dell XPS 13 Plus 9320 Core i7-1360P",
      slug: "dell-xps-13-plus-9320",
      description: "Thi\u1EBFt k\u1EBF b\xE0n ph\xEDm tr\xE0n vi\u1EC1n v\xF4 h\xECnh, touchpad k\xEDnh haptic ph\u1EA3n h\u1ED3i x\xFAc gi\xE1c.",
      price: 368e5,
      stock: 15,
      brand: "Dell",
      imageUrl: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&auto=format&fit=crop&q=80",
      categoryId: catLaptops.id
    },
    {
      sku: "ASUS-ROG-G16",
      name: "Asus ROG Strix G16 RTX 4060 Core i7",
      slug: "asus-rog-strix-g16-rtx4060",
      description: "Laptop Gaming m\xE0n h\xECnh 240Hz chu\u1EA9n m\xE0u \u0111\u1ED3 h\u1ECDa, t\u1EA3n nhi\u1EC7t kim lo\u1EA1i l\u1ECFng.",
      price: 3399e4,
      stock: 8,
      brand: "Asus",
      imageUrl: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&auto=format&fit=crop&q=80",
      categoryId: catLaptops.id
    },
    // Audio
    {
      sku: "AP-PRO-2",
      name: "Tai nghe Apple AirPods Pro 2 USB-C MagSafe",
      slug: "apple-airpods-pro-2-usbc",
      description: "Ch\u1ED1ng \u1ED3n ch\u1EE7 \u0111\u1ED9ng g\u1EA5p 2 l\u1EA7n, \xE2m thanh kh\xF4ng gian c\xE1 nh\xE2n h\xF3a.",
      price: 549e4,
      stock: 60,
      brand: "Apple",
      imageUrl: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&auto=format&fit=crop&q=80",
      categoryId: catAudio.id
    },
    {
      sku: "SONY-WH-1000XM5",
      name: "Tai nghe ch\u1EE5p tai Sony WH-1000XM5 Ch\u1ED1ng \u1ED3n",
      slug: "sony-wh-1000xm5-black",
      description: "C\xF4ng ngh\u1EC7 ch\u1ED1ng \u1ED3n s\u1ED1 1 th\u1EBF gi\u1EDBi v\u1EDBi 8 micro, th\u1EDDi l\u01B0\u1EE3ng pin 30 gi\u1EDD.",
      price: 799e4,
      stock: 22,
      brand: "Sony",
      imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
      categoryId: catAudio.id
    },
    {
      sku: "MARSHALL-EMBERTON-2",
      name: "Loa Bluetooth Marshall Emberton II 20W",
      slug: "loa-marshall-emberton-ii",
      description: "\xC2m thanh \u0111a h\u01B0\u1EDBng True Stereophonic, kh\xE1ng n\u01B0\u1EDBc chu\u1EA9n IP67 th\u1EDDi th\u01B0\u1EE3ng.",
      price: 389e4,
      stock: 30,
      brand: "Marshall",
      imageUrl: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80",
      categoryId: catAudio.id
    },
    // Smart Home
    {
      sku: "DREAM-L20-ULTRA",
      name: "Robot h\xFAt b\u1EE5i lau nh\xE0 Dreame L20 Ultra",
      slug: "robot-hut-bui-dreame-l20-ultra",
      description: "T\u1EF1 \u0111\u1ED9ng gi\u1EB7t s\u1EA5y gi\u1EBB n\u01B0\u1EDBc n\xF3ng, l\u1EF1c h\xFAt 7000Pa c\u1EF1c \u0111\u1EA1i, x\xF2e gi\u1EBB lau s\xE1t t\u01B0\u1EDDng.",
      price: 1999e4,
      stock: 14,
      brand: "Dreame",
      imageUrl: "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=600&auto=format&fit=crop&q=80",
      categoryId: catSmartHome.id
    },
    {
      sku: "DYSON-V12-SLIM",
      name: "M\xE1y h\xFAt b\u1EE5i c\u1EA7m tay Dyson V12 Detect Slim",
      slug: "may-hut-bui-dyson-v12-slim",
      description: "Tia laser ph\xE1t hi\u1EC7n b\u1EE5i vi m\xF4 v\xF4 h\xECnh, \u0111\u1EA7u h\xFAt ch\u1ED1ng r\u1ED1i t\xF3c \u0111\u1ED9c quy\u1EC1n.",
      price: 1699e4,
      stock: 10,
      brand: "Dyson",
      imageUrl: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&auto=format&fit=crop&q=80",
      categoryId: catSmartHome.id
    }
  ];
  const createdProducts = [];
  for (const item of productsData) {
    const p = await prisma.product.create({ data: item });
    createdProducts.push(p);
  }
  console.log(`\u2705 Seeded ${createdProducts.length} rich e-commerce products with SKUs and stock.`);
  const sampleOrder = await prisma.order.create({
    data: {
      orderCode: "SF-DEMO-001",
      userId: customer.id,
      status: import_client.OrderStatus.CONFIRMED,
      totalAmount: 3998e4,
      shippingAddress: "T\u1EA7ng 12 Keangnam Landmark 72, M\u1EC5 Tr\xEC, Nam T\u1EEB Li\xEAm, H\xE0 N\u1ED9i",
      phone: "0905555666",
      notes: "Giao h\xE0ng gi\u1EDD h\xE0nh ch\xEDnh, g\u1ECDi tr\u01B0\u1EDBc 15 ph\xFAt.",
      items: {
        create: [
          {
            productId: createdProducts[0].id,
            // iPhone 16 Pro Max
            quantity: 1,
            unitPrice: createdProducts[0].price,
            subtotal: createdProducts[0].price
          },
          {
            productId: createdProducts[8].id,
            // AirPods Pro 2
            quantity: 1,
            unitPrice: createdProducts[8].price,
            subtotal: createdProducts[8].price
          }
        ]
      }
    }
  });
  console.log(`\u2705 Seeded sample order ${sampleOrder.orderCode} with 2 items for customer.`);
  console.log("\u{1F389} Database seeding completed successfully!");
  console.log("----------------------------------------------------");
  console.log("\u{1F4CC} Demo Credentials:");
  console.log("   Admin:     admin@shopfast.vn     / Admin@123456");
  console.log("   Staff:     warehouse@shopfast.vn / Staff@123456");
  console.log("   Customer:  customer@shopfast.vn  / Customer@123456");
  console.log("   Sample Order Code: SF-DEMO-001");
  console.log("----------------------------------------------------");
}
main().catch((e) => {
  console.error("\u274C Error during seeding:", e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
