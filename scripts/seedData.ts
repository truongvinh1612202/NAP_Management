import { PrismaClient } from "../generated/client";

const prisma = new PrismaClient();

// Vietnamese employee names
const EMPLOYEE_NAMES = [
  "Nguyễn Văn An",
  "Trần Thị Bình",
  "Lê Hoàng Cường",
  "Phạm Thị Dung",
  "Hoàng Văn Em",
  "Vũ Thị Phượng",
  "Đặng Minh Giang",
  "Bùi Thị Hạnh",
  "Đỗ Văn Hưng",
  "Ngô Thị Lan",
  "Mai Văn Khoa",
  "Phan Thị Linh",
  "Dương Văn Minh",
  "Lý Thị Nga",
  "Trương Văn Oai",
];

// Vietnamese company data with unique tax IDs
const COMPANY_DATA = [
  {
    name: "Công ty TNHH Xuất Nhập Khẩu Hồng Phát",
    taxId: "0123456789",
    fee: 3500000,
  },
  {
    name: "Công ty Cổ Phần Thương Mại An Phú",
    taxId: "0123456790",
    fee: 4200000,
  },
  {
    name: "Công ty TNHH Sản Xuất Thanh Bình",
    taxId: "0123456791",
    fee: 2800000,
  },
  {
    name: "Công ty Cổ Phần Đầu Tư Minh Châu",
    taxId: "0123456792",
    fee: 5500000,
  },
  {
    name: "Công ty TNHH Xây Dựng Phương Nam",
    taxId: "0123456793",
    fee: 3200000,
  },
  {
    name: "Công ty Cổ Phần Dịch Vụ Tân Tiến",
    taxId: "0123456794",
    fee: 4800000,
  },
  { name: "Công ty TNHH Thực Phẩm Việt Hà", taxId: "0123456795", fee: 3000000 },
  {
    name: "Công ty Cổ Phần Công Nghệ Số Vàng",
    taxId: "0123456796",
    fee: 6200000,
  },
  { name: "Công ty TNHH Vận Tải Đại Dương", taxId: "0123456797", fee: 3700000 },
  { name: "Công ty Cổ Phần Dệt May Hà Nội", taxId: "0123456798", fee: 4500000 },
  { name: "Công ty TNHH Điện Tử Bách Khoa", taxId: "0123456799", fee: 5000000 },
  {
    name: "Công ty Cổ Phần Nông Nghiệp Xanh",
    taxId: "0123456800",
    fee: 2500000,
  },
  {
    name: "Công ty TNHH Du Lịch Hoàng Long",
    taxId: "0123456801",
    fee: 4000000,
  },
  { name: "Công ty Cổ Phần Y Tế Sức Khỏe", taxId: "0123456802", fee: 5800000 },
  {
    name: "Công ty TNHH Giáo Dục Tương Lai",
    taxId: "0123456803",
    fee: 3300000,
  },
  {
    name: "Công ty Cổ Phần Bất Động Sản Đông Á",
    taxId: "0123456804",
    fee: 7500000,
  },
  { name: "Công ty TNHH In Ấn Văn Hóa", taxId: "0123456805", fee: 2900000 },
  {
    name: "Công ty Cổ Phần Logistics Quốc Tế",
    taxId: "0123456806",
    fee: 6000000,
  },
  { name: "Công ty TNHH Kỹ Thuật Cơ Khí", taxId: "0123456807", fee: 3600000 },
  {
    name: "Công ty Cổ Phần Hóa Chất Công Nghiệp",
    taxId: "0123456808",
    fee: 5200000,
  },
  { name: "Công ty TNHH Nhựa Đại Thành", taxId: "0123456809", fee: 3100000 },
  { name: "Công ty Cổ Phần Thép Việt Nam", taxId: "0123456810", fee: 6500000 },
  {
    name: "Công ty TNHH May Mặc Thanh Hương",
    taxId: "0123456811",
    fee: 2700000,
  },
  {
    name: "Công ty Cổ Phần Điện Lạnh Miền Bắc",
    taxId: "0123456812",
    fee: 4300000,
  },
  {
    name: "Công ty TNHH Nội Thất Hoàng Gia",
    taxId: "0123456813",
    fee: 3900000,
  },
  { name: "Công ty Cổ Phần Viễn Thông Số", taxId: "0123456814", fee: 5600000 },
  {
    name: "Công ty TNHH Quảng Cáo Sáng Tạo",
    taxId: "0123456815",
    fee: 3400000,
  },
  {
    name: "Công ty Cổ Phần Thời Trang Việt",
    taxId: "0123456816",
    fee: 4100000,
  },
  {
    name: "Công ty TNHH Mỹ Phẩm Thiên Nhiên",
    taxId: "0123456817",
    fee: 4700000,
  },
  {
    name: "Công ty Cổ Phần Năng Lượng Xanh",
    taxId: "0123456818",
    fee: 8000000,
  },
];

const ROLES: Array<"LAP_SO" | "NHAP_SO_LIEU" | "DICH_VU_KH"> = [
  "LAP_SO",
  "NHAP_SO_LIEU",
  "DICH_VU_KH",
];

const PAYMENT_NOTES = [
  "Đã thanh toán đầy đủ",
  "Thanh toán qua chuyển khoản",
  "Thanh toán tiền mặt",
  null,
  null,
  "Đã nhận hóa đơn",
  "Thanh toán trước hạn",
];

// Helper: Get random element from array
function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper: Get random elements from array (without duplicates)
function getRandomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function clearDatabase() {
  console.log("🗑️  Clearing existing data...");

  // Delete in correct order (respecting foreign key constraints)
  await prisma.payment.deleteMany({});
  await prisma.companyEmployee.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.employee.deleteMany({});

  console.log("✅ Database cleared");
}

async function seedEmployees() {
  console.log("\n👥 Creating employees...");

  const employees = [];
  for (const fullName of EMPLOYEE_NAMES) {
    const employee = await prisma.employee.create({
      data: { fullName },
    });
    employees.push(employee);
    console.log(`   ✓ Created: ${fullName} (ID: ${employee.id})`);
  }

  console.log(`✅ Created ${employees.length} employees`);
  return employees;
}

async function seedCompanies() {
  console.log("\n🏢 Creating companies...");

  const companies = [];
  for (const companyData of COMPANY_DATA) {
    const company = await prisma.company.create({
      data: {
        companyName: companyData.name,
        taxId: companyData.taxId,
        serviceFee: companyData.fee,
      },
    });
    companies.push(company);
    console.log(`   ✓ Created: ${companyData.name} (ID: ${company.id})`);
  }

  console.log(`✅ Created ${companies.length} companies`);
  return companies;
}

async function seedEmployeeAssignments(
  employees: Array<{ id: number; fullName: string }>,
  companies: Array<{ id: number; companyName: string }>,
) {
  console.log("\n🔗 Assigning employees to companies...");

  let assignmentCount = 0;

  // Each company gets 1-3 employees assigned to different roles
  for (const company of companies) {
    const numAssignments = Math.floor(Math.random() * 3) + 1; // 1-3 employees
    const selectedRoles = getRandomElements(ROLES, numAssignments);
    const selectedEmployees = getRandomElements(employees, numAssignments);

    for (let i = 0; i < numAssignments; i++) {
      await prisma.companyEmployee.create({
        data: {
          companyId: company.id,
          employeeId: selectedEmployees[i].id,
          role: selectedRoles[i],
        },
      });
      assignmentCount++;
    }

    console.log(
      `   ✓ Assigned ${numAssignments} employee(s) to ${company.companyName}`,
    );
  }

  console.log(`✅ Created ${assignmentCount} employee assignments`);
}

async function seedPayments(
  companies: Array<{ id: number; companyName: string }>,
) {
  console.log("\n💰 Creating payments...");

  const CURRENT_YEAR = 2026;
  const MONTHS = [1, 2, 3]; // January, February, March 2026

  let paymentCount = 0;

  // Create payments for 70% of companies for recent months
  const companiesWithPayments = getRandomElements(
    companies,
    Math.floor(companies.length * 0.7),
  );

  for (const company of companiesWithPayments) {
    // Each company gets 1-3 months of payment records
    const numMonths = Math.floor(Math.random() * 3) + 1;
    const selectedMonths = getRandomElements(MONTHS, numMonths);

    for (const month of selectedMonths) {
      await prisma.payment.create({
        data: {
          companyId: company.id,
          month,
          year: CURRENT_YEAR,
          note: getRandomElement(PAYMENT_NOTES),
        },
      });
      paymentCount++;
    }

    console.log(
      `   ✓ Created ${numMonths} payment(s) for ${company.companyName}`,
    );
  }

  console.log(`✅ Created ${paymentCount} payments`);
}

async function main() {
  const args = process.argv.slice(2);
  const shouldReset = args.includes("--reset");

  try {
    console.log("🚀 Starting database seed...\n");
    console.log("═══════════════════════════════════════");

    // Check if data already exists
    const existingEmployeeCount = await prisma.employee.count();
    const existingCompanyCount = await prisma.company.count();

    if (
      !shouldReset &&
      (existingEmployeeCount > 0 || existingCompanyCount > 0)
    ) {
      console.log("⚠️  Database already contains data:");
      console.log(`   • ${existingEmployeeCount} employees`);
      console.log(`   • ${existingCompanyCount} companies`);
      console.log(
        "\n💡 Use 'npm run seed:reset' to clear existing data and re-seed",
      );
      console.log(
        "   Or manually clear the database first with: npx prisma migrate reset --force\n",
      );
      await prisma.$disconnect();
      process.exit(0);
    }

    if (shouldReset) {
      await clearDatabase();
    }

    // Seed in correct order
    const employees = await seedEmployees();
    const companies = await seedCompanies();
    await seedEmployeeAssignments(employees, companies);
    await seedPayments(companies);

    console.log("\n═══════════════════════════════════════");
    console.log("✨ Database seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   • ${employees.length} employees`);
    console.log(`   • ${companies.length} companies`);
    console.log(`   • Employee assignments across all companies`);
    console.log(`   • Payment records for January-March 2026`);
    console.log("\n💡 Tip: Use 'npm run seed:reset' to clear and re-seed\n");
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
