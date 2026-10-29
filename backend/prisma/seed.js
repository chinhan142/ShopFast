"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seeding for ShopFast...');
    // 1. Clean existing records safely
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    const passwordSalt = 10;
    // 2. Seed Users
    const adminPassword = await bcrypt.hash('Admin@123456', passwordSalt);
    const staffPassword = await bcrypt.hash('Staff@123456', passwordSalt);
    const customerPassword = await bcrypt.hash('Customer@123456', passwordSalt);
    const admin = await prisma.user.create({
        data: {
            email: 'admin@shopfast.vn',
            password: adminPassword,
            fullName: 'Quản Trị Viên ShopFast',
            phone: '0901111222',
            role: client_1.Role.ADMIN,
        },
    });
    const staff = await prisma.user.create({
        data: {
            email: 'warehouse@shopfast.vn',
            password: staffPassword,
            fullName: 'Trần Văn Kho (Staff)',
            phone: '0903333444',
            role: client_1.Role.STAFF,
        },
    });
    const customer = await prisma.user.create({
        data: {
            email: 'customer@shopfast.vn',
            password: customerPassword,
            fullName: 'Lê Hoàng Khách Hàng',
            phone: '0905555666',
            role: client_1.Role.CUSTOMER,
        },
    });
    console.log('✅ Seeded 3 system users (Admin, Warehouse Staff, Customer).');
    // 3. Seed Categories
    const catPhones = await prisma.category.create({
        data: {
            name: 'Điện thoại & Tablet',
            slug: 'dien-thoai-tablet',
            description: 'Smartphone và máy tính bảng chính hãng cao cấp',
        },
    });
    const catLaptops = await prisma.category.create({
        data: {
            name: 'Laptop & Phụ kiện',
            slug: 'laptop-phu-kien',
            description: 'Laptop văn phòng, gaming và thiết bị ngoại vi',
        },
    });
    const catAudio = await prisma.category.create({
        data: {
            name: 'Âm thanh & Tai nghe',
            slug: 'am-thanh-tai-nghe',
            description: 'Tai nghe chống ồn, loa bluetooth cao cấp',
        },
    });
    const catSmartHome = await prisma.category.create({
        data: {
            name: 'Gia dụng thông minh',
            slug: 'gia-dung-thong-minh',
            description: 'Robot hút bụi, máy lọc không khí và smart home',
        },
    });
    console.log('✅ Seeded 4 product categories.');
    // 4. Seed Products
    const productsData = [
        // Phones
        {
            sku: 'IP16-PM-256',
            name: 'iPhone 16 Pro Max 256GB Titan Sa Mạc',
            slug: 'iphone-16-pro-max-256gb',
            description: 'Chip A18 Pro mạnh mẽ, camera 48MP Fusion điều khiển camera thế hệ mới.',
            price: 34490000,
            stock: 35,
            brand: 'Apple',
            imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80',
            categoryId: catPhones.id,
        },
        {
            sku: 'SS-S24U-256',
            name: 'Samsung Galaxy S24 Ultra 12GB/256GB',
            slug: 'samsung-galaxy-s24-ultra',
            description: 'Galaxy AI đỉnh cao, bút S-Pen tích hợp, khung viền Titan siêu bền.',
            price: 27990000,
            stock: 40,
            brand: 'Samsung',
            imageUrl: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&auto=format&fit=crop&q=80',
            categoryId: catPhones.id,
        },
        {
            sku: 'IP15-128',
            name: 'iPhone 15 128GB Xanh Pastel',
            slug: 'iphone-15-128gb',
            description: 'Dynamic Island, camera 48MP, cổng sạc USB-C tiện lợi.',
            price: 18990000,
            stock: 25,
            brand: 'Apple',
            imageUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80',
            categoryId: catPhones.id,
        },
        {
            sku: 'XM-14-512',
            name: 'Xiaomi 14 5G 12GB/512GB Leica',
            slug: 'xiaomi-14-5g-512gb',
            description: 'Ống kính quang học Leica Summilux, sạc nhanh HyperCharge 90W.',
            price: 19490000,
            stock: 18,
            brand: 'Xiaomi',
            imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
            categoryId: catPhones.id,
        },
        // Laptops
        {
            sku: 'MBA-M3-16',
            name: 'MacBook Air 13 inch M3 (16GB RAM / 256GB SSD)',
            slug: 'macbook-air-13-m3-16gb',
            description: 'Siêu mỏng nhẹ 1.24kg, pin lên đến 18 tiếng, màn hình Liquid Retina tuyệt đẹp.',
            price: 29490000,
            stock: 20,
            brand: 'Apple',
            imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80',
            categoryId: catLaptops.id,
        },
        {
            sku: 'MBP-M3P-512',
            name: 'MacBook Pro 14 inch M3 Pro (18GB RAM / 512GB SSD)',
            slug: 'macbook-pro-14-m3-pro',
            description: 'Màn hình XDR 120Hz ProMotion, quạt làm mát chủ động hiệu năng tối đa.',
            price: 48990000,
            stock: 12,
            brand: 'Apple',
            imageUrl: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&auto=format&fit=crop&q=80',
            categoryId: catLaptops.id,
        },
        {
            sku: 'DELL-XPS-13',
            name: 'Dell XPS 13 Plus 9320 Core i7-1360P',
            slug: 'dell-xps-13-plus-9320',
            description: 'Thiết kế bàn phím tràn viền vô hình, touchpad kính haptic phản hồi xúc giác.',
            price: 36800000,
            stock: 15,
            brand: 'Dell',
            imageUrl: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&auto=format&fit=crop&q=80',
            categoryId: catLaptops.id,
        },
        {
            sku: 'ASUS-ROG-G16',
            name: 'Asus ROG Strix G16 RTX 4060 Core i7',
            slug: 'asus-rog-strix-g16-rtx4060',
            description: 'Laptop Gaming màn hình 240Hz chuẩn màu đồ họa, tản nhiệt kim loại lỏng.',
            price: 33990000,
            stock: 8,
            brand: 'Asus',
            imageUrl: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&auto=format&fit=crop&q=80',
            categoryId: catLaptops.id,
        },
        // Audio
        {
            sku: 'AP-PRO-2',
            name: 'Tai nghe Apple AirPods Pro 2 USB-C MagSafe',
            slug: 'apple-airpods-pro-2-usbc',
            description: 'Chống ồn chủ động gấp 2 lần, âm thanh không gian cá nhân hóa.',
            price: 5490000,
            stock: 60,
            brand: 'Apple',
            imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&auto=format&fit=crop&q=80',
            categoryId: catAudio.id,
        },
        {
            sku: 'SONY-WH-1000XM5',
            name: 'Tai nghe chụp tai Sony WH-1000XM5 Chống ồn',
            slug: 'sony-wh-1000xm5-black',
            description: 'Công nghệ chống ồn số 1 thế giới với 8 micro, thời lượng pin 30 giờ.',
            price: 7990000,
            stock: 22,
            brand: 'Sony',
            imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
            categoryId: catAudio.id,
        },
        {
            sku: 'MARSHALL-EMBERTON-2',
            name: 'Loa Bluetooth Marshall Emberton II 20W',
            slug: 'loa-marshall-emberton-ii',
            description: 'Âm thanh đa hướng True Stereophonic, kháng nước chuẩn IP67 thời thượng.',
            price: 3890000,
            stock: 30,
            brand: 'Marshall',
            imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80',
            categoryId: catAudio.id,
        },
        // Smart Home
        {
            sku: 'DREAM-L20-ULTRA',
            name: 'Robot hút bụi lau nhà Dreame L20 Ultra',
            slug: 'robot-hut-bui-dreame-l20-ultra',
            description: 'Tự động giặt sấy giẻ nước nóng, lực hút 7000Pa cực đại, xòe giẻ lau sát tường.',
            price: 19990000,
            stock: 14,
            brand: 'Dreame',
            imageUrl: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=600&auto=format&fit=crop&q=80',
            categoryId: catSmartHome.id,
        },
        {
            sku: 'DYSON-V12-SLIM',
            name: 'Máy hút bụi cầm tay Dyson V12 Detect Slim',
            slug: 'may-hut-bui-dyson-v12-slim',
            description: 'Tia laser phát hiện bụi vi mô vô hình, đầu hút chống rối tóc độc quyền.',
            price: 16990000,
            stock: 10,
            brand: 'Dyson',
            imageUrl: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&auto=format&fit=crop&q=80',
            categoryId: catSmartHome.id,
        },
    ];
    const createdProducts = [];
    for (const item of productsData) {
        const p = await prisma.product.create({ data: item });
        createdProducts.push(p);
    }
    console.log(`✅ Seeded ${createdProducts.length} rich e-commerce products with SKUs and stock.`);
    // 5. Seed a Sample Order for Customer
    const sampleOrder = await prisma.order.create({
        data: {
            orderCode: 'SF-DEMO-001',
            userId: customer.id,
            status: client_1.OrderStatus.CONFIRMED,
            totalAmount: 39980000,
            shippingAddress: 'Tầng 12 Keangnam Landmark 72, Mễ Trì, Nam Từ Liêm, Hà Nội',
            phone: '0905555666',
            notes: 'Giao hàng giờ hành chính, gọi trước 15 phút.',
            items: {
                create: [
                    {
                        productId: createdProducts[0].id, // iPhone 16 Pro Max
                        quantity: 1,
                        unitPrice: createdProducts[0].price,
                        subtotal: createdProducts[0].price,
                    },
                    {
                        productId: createdProducts[8].id, // AirPods Pro 2
                        quantity: 1,
                        unitPrice: createdProducts[8].price,
                        subtotal: createdProducts[8].price,
                    },
                ],
            },
        },
    });
    console.log(`✅ Seeded sample order ${sampleOrder.orderCode} with 2 items for customer.`);
    console.log('🎉 Database seeding completed successfully!');
    console.log('----------------------------------------------------');
    console.log('📌 Demo Credentials:');
    console.log('   Admin:     admin@shopfast.vn     / Admin@123456');
    console.log('   Staff:     warehouse@shopfast.vn / Staff@123456');
    console.log('   Customer:  customer@shopfast.vn  / Customer@123456');
    console.log('   Sample Order Code: SF-DEMO-001');
    console.log('----------------------------------------------------');
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
