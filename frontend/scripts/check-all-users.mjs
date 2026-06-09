import { chromium } from "playwright";

const USERS = [
  {
    role: "ADMIN",
    email: "admin@buruuj.school",
    password: "admin123",
    expectedNav: [
      "Dashboard",
      "Students",
      "Drivers",
      "Buses",
      "Maintenance",
      "Payments",
      "Attendance",
      "Live Tracking",
      "Reports",
      "AI Assistant",
      "Settings"
    ],
    expectedPages: ["/dashboard", "/live-tracking", "/students"]
  },
  {
    role: "FINANCIAL_OFFICER",
    email: "finance@buruuj.school",
    password: "finance123",
    expectedNav: ["Dashboard", "Maintenance", "Payments", "Reports"],
    expectedPages: ["/dashboard", "/payments", "/reports"]
  },
  {
    role: "DRIVER",
    email: "driver@buruuj.school",
    password: "driver123",
    expectedNav: ["Dashboard", "My Students", "Breakdown Reports", "Attendance", "My Bus", "Live Tracking"],
    expectedPages: ["/dashboard", "/live-tracking", "/my-bus"]
  }
];

async function login(page, email, password) {
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.fill('input[name="username"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 120000, waitUntil: "domcontentloaded" });
}

async function getVisibleNavLabels(page) {
  return page.locator("aside nav a").allTextContents();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const user of USERS) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const result = {
      role: user.role,
      email: user.email,
      login: "FAIL",
      nav: [],
      missingNav: [],
      pages: {},
      errors: []
    };

    try {
      await login(page, user.email, user.password);
      result.login = "OK";

      const navLabels = (await getVisibleNavLabels(page)).map((t) => t.trim()).filter(Boolean);
      result.nav = navLabels;
      result.missingNav = user.expectedNav.filter((label) => !navLabels.includes(label));

      for (const path of user.expectedPages) {
        await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle" });
        const status = page.url().includes(path) ? "OK" : `Redirected to ${page.url()}`;
        const bodyText = await page.locator("main").innerText().catch(() => "");
        result.pages[path] = {
          status,
          hasContent: bodyText.length > 20
        };
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    results.push(result);
    await context.close();
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})();
