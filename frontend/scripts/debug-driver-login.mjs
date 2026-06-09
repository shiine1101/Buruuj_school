import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("console", (msg) => console.log("BROWSER CONSOLE:", msg.text()));
  page.on("pageerror", (err) => console.error("BROWSER PAGE ERROR:", err));
  
  console.log("Navigating to login page...");
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  
  console.log("Filling login fields...");
  await page.fill('input[name="username"]', "driver@buruuj.school");
  await page.fill('input[name="password"]', "driver123");
  
  console.log("Submitting login form...");
  await page.click('button[type="submit"]');
  
  console.log("Waiting 5 seconds for page load/redirect...");
  await page.waitForTimeout(5000);
  
  console.log("Current URL:", page.url());
  
  const bodyText = await page.locator("body").innerText();
  console.log("Body Snippet (first 400 chars):", bodyText.slice(0, 400));
  
  await browser.close();
})();
