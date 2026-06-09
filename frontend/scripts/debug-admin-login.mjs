import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("console", (msg) => console.log("CONSOLE:", msg.text()));
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.fill('input[name="username"]', "admin@buruuj.school");
  await page.fill('input[name="password"]', "admin123");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  console.log("URL:", page.url());
  console.log("ERROR:", await page.locator("text=Invalid credentials").count());
  console.log("BODY:", (await page.locator("body").innerText()).slice(0, 500));
  await browser.close();
})();
