import { prisma } from "../lib/prisma";
import { auth } from "../lib/auth";

async function seedUser(email: string, name: string, password: string, role: "ADMIN" | "AGENT") {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Skipping ${email} — already exists`);
    return;
  }
  const result = await auth.api.signUpEmail({ body: { email, name, password } });
  await prisma.user.update({ where: { id: result.user.id }, data: { role } });
  console.log(`Seeded ${role.toLowerCase()}:`, email);
}

async function main() {
  await seedUser("admin@example.com", "Admin User", "admin123", "ADMIN");
  await seedUser("agent@example.com", "Support Agent", "agent123", "AGENT");

  const articles = [
    {
      title: "How to reset your password",
      content:
        "To reset your password, click on 'Forgot Password' on the login page. Enter your registered email address. You will receive a password reset link within 5 minutes. Click the link and follow the instructions to create a new password.",
      category: "TECHNICAL_QUESTION" as const,
    },
    {
      title: "Refund policy",
      content:
        "We offer a 30-day money-back guarantee on all courses. To request a refund, contact our support team with your order number. Refunds are processed within 5-7 business days. Note that refunds are not available after course completion certificates have been issued.",
      category: "REFUND_REQUEST" as const,
    },
    {
      title: "Course access issues",
      content:
        "If you cannot access a course you purchased, first try clearing your browser cache. Make sure you are logged in with the correct account. Check your purchase confirmation email. If issues persist, contact support with your order ID and the course name.",
      category: "TECHNICAL_QUESTION" as const,
    },
    {
      title: "General FAQ",
      content:
        "Our platform supports all modern browsers. Courses are available on mobile and desktop. Downloaded content can be accessed offline via our mobile app. For billing inquiries, please have your order number ready.",
      category: "GENERAL_QUESTION" as const,
    },
  ];

  for (const article of articles) {
    await prisma.knowledgeBase.upsert({
      where: { id: article.title },
      update: {},
      create: article,
    });
  }
  console.log("Seeded knowledge base articles");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
