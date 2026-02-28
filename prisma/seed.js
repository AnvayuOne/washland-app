const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const catalog = [
  {
    name: "Everyday Laundry",
    description: "Regular laundry services for daily wear. Good candidate for recurring plans.",
    services: [
      {
        name: "Wash & Fold",
        basePrice: 79,
        serviceType: "PER_KG",
        notes: "Basic laundry",
        futureTags: ["everyday", "subscription_candidate"],
      },
      {
        name: "Wash, Iron & Fold",
        basePrice: 99,
        serviceType: "PER_KG",
        notes: "Popular bundle",
        futureTags: ["everyday", "popular", "subscription_candidate"],
      },
      {
        name: "Steam Iron (Clothes)",
        basePrice: 15,
        serviceType: "PER_PIECE",
        notes: "No wash",
        futureTags: ["iron_only", "everyday"],
      },
      {
        name: "Express Laundry (24 hrs)",
        basePrice: 40,
        serviceType: "ADD_ON_PER_KG",
        notes: "Add-on pricing",
        futureTags: ["express", "premium_speed"],
      },
      {
        name: "Same Day Laundry",
        basePrice: 70,
        serviceType: "ADD_ON_PER_KG",
        notes: "Premium speed",
        futureTags: ["same_day", "premium_speed"],
      },
    ],
  },
  {
    name: "Formal Wear & Office Wear",
    description: "Per-piece formal and office wear services.",
    services: [
      { name: "Shirt - Wash & Iron", basePrice: 59, serviceType: "PER_PIECE", notes: "", futureTags: ["formal"] },
      { name: "Shirt - Dry Clean", basePrice: 89, serviceType: "PER_PIECE_PREMIUM", notes: "Premium finish", futureTags: ["formal", "premium"] },
      { name: "Trousers - Wash & Iron", basePrice: 69, serviceType: "PER_PIECE", notes: "", futureTags: ["formal"] },
      { name: "Trousers - Dry Clean", basePrice: 109, serviceType: "PER_PIECE_PREMIUM", notes: "", futureTags: ["formal", "premium"] },
      { name: "Blazer - Dry Clean", basePrice: 199, serviceType: "PER_PIECE_PREMIUM", notes: "Structured garment", futureTags: ["formal", "premium"] },
      { name: "Suit (2 Piece) - Dry Clean", basePrice: 299, serviceType: "PER_PIECE_PREMIUM", notes: "Coat + Pant", futureTags: ["formal", "premium"] },
      { name: "Suit (3 Piece) - Dry Clean", basePrice: 349, serviceType: "PER_PIECE_PREMIUM", notes: "", futureTags: ["formal", "premium"] },
    ],
  },
  {
    name: "Ethnic & Designer Wear",
    description: "Premium dry-clean care for ethnic and designer garments.",
    services: [
      { name: "Saree - Dry Clean", basePrice: 199, serviceType: "PER_PIECE_PREMIUM", notes: "Regular fabric", futureTags: ["ethnic", "premium"] },
      { name: "Silk Saree - Dry Clean", basePrice: 299, serviceType: "PER_PIECE_PREMIUM", notes: "Special handling", futureTags: ["ethnic", "silk", "premium"] },
      { name: "Lehenga - Dry Clean", basePrice: 499, serviceType: "PER_PIECE_PREMIUM", notes: "Heavy garment", futureTags: ["ethnic", "designer", "premium"] },
      { name: "Sherwani - Dry Clean", basePrice: 399, serviceType: "PER_PIECE_PREMIUM", notes: "", futureTags: ["ethnic", "premium"] },
      { name: "Kurta - Dry Clean", basePrice: 149, serviceType: "PER_PIECE_PREMIUM", notes: "", futureTags: ["ethnic"] },
      { name: "Bridal Wear - Dry Clean", basePrice: 999, serviceType: "PER_PIECE_PREMIUM", notes: "Quote based", futureTags: ["bridal", "designer", "premium"] },
    ],
  },
  {
    name: "Casual Wear",
    description: "Per-piece care for casual clothing.",
    services: [
      { name: "T-Shirt - Wash & Iron", basePrice: 39, serviceType: "PER_PIECE", notes: "", futureTags: ["casual"] },
      { name: "Jeans - Wash & Iron", basePrice: 79, serviceType: "PER_PIECE", notes: "", futureTags: ["casual"] },
      { name: "Jacket - Dry Clean", basePrice: 249, serviceType: "PER_PIECE_PREMIUM", notes: "", futureTags: ["casual", "premium"] },
      { name: "Hoodie - Wash & Iron", basePrice: 89, serviceType: "PER_PIECE", notes: "", futureTags: ["casual"] },
      { name: "Winter Coat - Dry Clean", basePrice: 399, serviceType: "PER_PIECE_PREMIUM", notes: "", futureTags: ["casual", "winter", "premium"] },
    ],
  },
  {
    name: "Home Linen",
    description: "Linen services with strong recurring subscription potential.",
    services: [
      { name: "Bed Sheet (Single)", basePrice: 79, serviceType: "PER_PIECE", notes: "", futureTags: ["home_linen", "subscription_candidate"] },
      { name: "Bed Sheet (Double)", basePrice: 99, serviceType: "PER_PIECE", notes: "", futureTags: ["home_linen", "subscription_candidate"] },
      { name: "Blanket - Single", basePrice: 199, serviceType: "PER_PIECE", notes: "", futureTags: ["home_linen"] },
      { name: "Blanket - Double", basePrice: 299, serviceType: "PER_PIECE", notes: "", futureTags: ["home_linen"] },
      { name: "Quilt / Comforter", basePrice: 349, serviceType: "PER_PIECE", notes: "", futureTags: ["home_linen"] },
      { name: "Pillow Cover", basePrice: 19, serviceType: "PER_PIECE", notes: "", futureTags: ["home_linen", "subscription_candidate"] },
      { name: "Curtains (Per Panel)", basePrice: 99, serviceType: "PER_PIECE", notes: "", futureTags: ["home_linen"] },
      { name: "Sofa Cover (Per Seat)", basePrice: 129, serviceType: "PER_PIECE", notes: "", futureTags: ["home_linen"] },
    ],
  },
  {
    name: "Shoe & Bag Spa",
    description: "High-margin premium care for shoes and bags.",
    services: [
      { name: "Sports Shoes Cleaning", basePrice: 299, serviceType: "PER_PIECE_PREMIUM", notes: "Deep clean", futureTags: ["shoe_spa", "premium"] },
      { name: "Leather Shoes Spa", basePrice: 399, serviceType: "PER_PIECE_PREMIUM", notes: "Polish + conditioning", futureTags: ["shoe_spa", "premium"] },
      { name: "Suede Shoe Cleaning", basePrice: 449, serviceType: "PER_PIECE_PREMIUM", notes: "Premium", futureTags: ["shoe_spa", "premium"] },
      { name: "Handbag Cleaning", basePrice: 399, serviceType: "PER_PIECE_PREMIUM", notes: "", futureTags: ["bag_spa", "premium"] },
      { name: "Leather Bag Spa", basePrice: 599, serviceType: "PER_PIECE_PREMIUM", notes: "", futureTags: ["bag_spa", "premium"] },
      { name: "Shoe Deodorizing", basePrice: 149, serviceType: "ADD_ON", notes: "Add-on", futureTags: ["shoe_spa", "add_on"] },
    ],
  },
  {
    name: "Specialty Items",
    description: "Specialty cleaning services for non-standard items.",
    services: [
      { name: "Teddy Bear Cleaning", basePrice: 249, serviceType: "PER_PIECE", notes: "", futureTags: ["specialty"] },
      { name: "Carpet Cleaning (Per Sq Ft)", basePrice: 12, serviceType: "PER_SQ_FT", notes: "", futureTags: ["specialty"] },
      { name: "Doormat Cleaning", basePrice: 79, serviceType: "PER_PIECE", notes: "", futureTags: ["specialty"] },
      { name: "Baby Stroller Cleaning", basePrice: 349, serviceType: "PER_PIECE", notes: "", futureTags: ["specialty", "premium"] },
    ],
  },
  {
    name: "Add-On Services",
    description: "Optional treatments and enhancements.",
    services: [
      { name: "Stain Removal (Basic)", basePrice: 49, serviceType: "ADD_ON", notes: "Per item", futureTags: ["add_on"] },
      { name: "Premium Stain Removal", basePrice: 99, serviceType: "ADD_ON_PREMIUM", notes: "", futureTags: ["add_on", "premium"] },
      { name: "Fabric Softener Treatment", basePrice: 19, serviceType: "ADD_ON", notes: "", futureTags: ["add_on"] },
      { name: "Anti-Bacterial Treatment", basePrice: 29, serviceType: "ADD_ON", notes: "", futureTags: ["add_on"] },
      { name: "Fabric Protection Coating", basePrice: 79, serviceType: "ADD_ON_PREMIUM", notes: "", futureTags: ["add_on", "premium"] },
    ],
  },
];

function buildServiceDescription(service) {
  return service.notes || "";
}

async function seedCatalog() {
  let categoriesCreated = 0;
  let categoriesUpdated = 0;
  let servicesCreated = 0;
  let servicesUpdated = 0;

  for (const categoryData of catalog) {
    const existingCategory = await prisma.serviceCategory.findUnique({
      where: { name: categoryData.name },
      select: { id: true },
    });

    const category = await prisma.serviceCategory.upsert({
      where: { name: categoryData.name },
      update: {
        description: categoryData.description,
        isActive: true,
      },
      create: {
        name: categoryData.name,
        description: categoryData.description,
        isActive: true,
      },
      select: { id: true, name: true },
    });

    if (existingCategory) {
      categoriesUpdated += 1;
    } else {
      categoriesCreated += 1;
    }

    for (const serviceData of categoryData.services) {
      const existingService = await prisma.service.findFirst({
        where: {
          name: serviceData.name,
          categoryId: category.id,
        },
        select: { id: true },
      });

      const payload = {
        name: serviceData.name,
        description: buildServiceDescription(serviceData),
        basePrice: serviceData.basePrice,
        category: categoryData.name,
        categoryId: category.id,
        isActive: true,
      };

      if (existingService) {
        await prisma.service.update({
          where: { id: existingService.id },
          data: payload,
          select: { id: true },
        });
        servicesUpdated += 1;
      } else {
        await prisma.service.create({
          data: payload,
          select: { id: true },
        });
        servicesCreated += 1;
      }
    }
  }

  console.log("Service catalog seed complete");
  console.log(
    JSON.stringify(
      {
        categoriesCreated,
        categoriesUpdated,
        servicesCreated,
        servicesUpdated,
        totalCategories: catalog.length,
        totalServices: catalog.reduce((sum, c) => sum + c.services.length, 0),
      },
      null,
      2
    )
  );
}

async function main() {
  await seedCatalog();
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
