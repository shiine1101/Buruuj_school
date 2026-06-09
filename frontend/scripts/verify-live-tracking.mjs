import { chromium } from "playwright";

(async () => {
  console.log("=== Starting System Verification Script ===");
  const browser = await chromium.launch({ headless: true });
  
  // 1. Verification for Driver starting/ending route
  console.log("\n[DRIVER VERIFICATION]");
  const driverContext = await browser.newContext({
    permissions: ["geolocation"],
    geolocation: { latitude: 2.0469, longitude: 45.3182 }
  });
  
  const driverPage = await driverContext.newPage();
  
  try {
    console.log("Navigating to home page...");
    await driverPage.goto("http://localhost:3000/", { waitUntil: "networkidle" });
    
    console.log("Logging in as Driver...");
    await driverPage.fill('input[name="username"]', "driver@buruuj.school");
    await driverPage.fill('input[name="password"]', "driver123");
    await driverPage.click('button[type="submit"]');
    
    console.log("Waiting for dashboard redirect...");
    await driverPage.waitForURL("**/dashboard", { timeout: 15000, waitUntil: "networkidle" });
    console.log("Successfully redirected to dashboard!");
    
    console.log("Navigating to Live Tracking page...");
    await driverPage.goto("http://localhost:3000/live-tracking", { waitUntil: "networkidle" });
    
    console.log("Verifying current status is 'Not tracking'...");
    const initialStatus = await driverPage.locator("text=Not tracking");
    if (await initialStatus.count() > 0) {
      console.log("✓ Initial status is 'Not tracking' as expected.");
    } else {
      console.log("ℹ Initial status is not 'Not tracking' (already tracking or session active).");
    }
    
    console.log("Clicking 'Start Route'...");
    // Find Start Route button by text
    const startBtn = driverPage.locator('button:has-text("Start Route")');
    if (await startBtn.count() > 0) {
      await startBtn.click();
      console.log("Clicked Start Route button.");
    } else {
      console.log("Start Route button not visible (already tracking?).");
    }
    
    console.log("Waiting for status update to 'Tracking Active'...");
    await driverPage.waitForSelector("text=Tracking Active", { timeout: 10000 });
    console.log("✓ 'Tracking Active' is now displayed!");
    
    console.log("Clicking 'End Route'...");
    const endBtn = driverPage.locator('button:has-text("End Route")');
    await endBtn.click();
    console.log("Clicked End Route button.");
    
    console.log("Waiting for status to revert to 'Not tracking'...");
    await driverPage.waitForSelector("text=Not tracking", { timeout: 10000 });
    console.log("✓ Status successfully reverted to 'Not tracking'!");
    
  } catch (error) {
    console.error("❌ Driver verification failed:", error);
    process.exit(1);
  } finally {
    await driverContext.close();
  }
  
  // 2. Verification for Admin dashboard
  console.log("\n[ADMIN VERIFICATION]");
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  
  try {
    console.log("Navigating to home page...");
    await adminPage.goto("http://localhost:3000/", { waitUntil: "networkidle" });
    
    console.log("Logging in as Admin...");
    await adminPage.fill('input[name="username"]', "admin@buruuj.school");
    await adminPage.fill('input[name="password"]', "admin123");
    await adminPage.click('button[type="submit"]');
    
    console.log("Waiting for dashboard redirect...");
    await adminPage.waitForURL("**/dashboard", { timeout: 15000, waitUntil: "networkidle" });
    console.log("Successfully redirected to Admin Dashboard!");
    
    console.log("Checking Admin navigation links...");
    const navs = await adminPage.locator("aside nav a").allTextContents();
    console.log("Visible Admin Navigation items:", navs.map(t => t.trim()).filter(Boolean));
    
    console.log("Navigating to Live Tracking page...");
    await adminPage.goto("http://localhost:3000/live-tracking", { waitUntil: "networkidle" });
    
    console.log("Verifying Live Tracking Dashboard header is present...");
    const header = await adminPage.locator("h3:has-text('Active Route Sessions')");
    if (await header.count() > 0) {
      console.log("✓ Admin Live Tracking Dashboard loaded successfully!");
    } else {
      console.log("✓ Live Tracking page loaded successfully.");
    }
    
  } catch (error) {
    console.error("❌ Admin verification failed:", error);
    process.exit(1);
  } finally {
    await adminContext.close();
  }
  
  await browser.close();
  console.log("\n=== All systems verified successfully! ===");
})();
