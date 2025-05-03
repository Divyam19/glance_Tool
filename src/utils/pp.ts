import axios from "axios";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

export async function puppet(imageUrl: string, desiredUrl: string) {
  const browser = await puppeteer.launch({
    headless: false,
    ignoreHTTPSErrors: true,
    args: [
      "--ignore-certificate-errors",
      "--no-sandbox",
      "--disable-web-security",
      "--allow-insecure-localhost",
      "--disable-extensions",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-content-security-policy",
      "--disable-features=BlockInsecurePrivateNetworkRequests",
      "--disable-features=AdTagging",
      "--disable-client-side-phishing-detection",
    ],
  });

  const page = await browser.newPage();

  // Disable content blocking
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  );

  // Disable request interception (this might be causing issues)
  // Instead of intercepting all requests, let's just proceed normally
  // await page.setRequestInterception(true);
  // page.on("request", (request) => {
  //   request.continue();
  // });

  try {
    // Navigate to the URL with a longer timeout
    console.log("Navigating to:", desiredUrl);

    // Try a different navigation approach
    await page.evaluate((url) => {
      window.location.href = url;
    }, desiredUrl);

    // Wait for navigation to complete
    await page.waitForNavigation({ timeout: 120000 }).catch((e) => {
      console.log("Navigation timeout, but continuing anyway:", e.message);
    });

    // Wait a moment to ensure page is fully loaded
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log("Checking current page...");
    const currentUrl = await page.url();
    console.log("Current URL:", currentUrl);

    // Check if we're on the security warning page
    const isWarningPage = await page.evaluate(() => {
      const bodyText = document.body.innerText || "";
      return (
        bodyText.includes("doesn't support a secure connection") ||
        bodyText.includes("not secure") ||
        bodyText.includes("Your connection is not private")
      );
    });

    if (isWarningPage) {
      console.log("Detected security warning page, attempting to continue...");

      // Try multiple approaches to click the continue button

      // First approach: Try clicking by selector
      try {
        // Look for the specific button visible in your screenshot
        const buttonSelector =
          'button[id="continue-to-site"], button:contains("Continue to site"), .proceed-button, #proceed-button';
        const buttonExists = await page.$(buttonSelector);

        if (buttonExists) {
          await page.click(buttonSelector);
          console.log("Clicked continue button by selector");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          console.log("Button not found by selector");
        }
      } catch (clickError) {
        console.log("Error clicking by selector:", clickError.message);
      }

      // Second approach: Try clicking by evaluating in page context
      if (
        await page.evaluate(() =>
          document.body.innerText.includes(
            "doesn't support a secure connection"
          )
        )
      ) {
        try {
          await page.evaluate(() => {
            // Try to find any button with text that includes "Continue"
            const allButtons = Array.from(document.querySelectorAll("button"));
            const continueButton = allButtons.find((btn) =>
              btn.innerText.includes("Continue to site")
            );

            if (continueButton) {
              continueButton.click();
              return true;
            }
            return false;
          });
          console.log("Attempted to click via page.evaluate");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (evalError) {
          console.log("Error in page.evaluate:", evalError.message);
        }
      }

      // Third approach: Try clicking by coordinates based on the screenshot
      try {
        // Based on your screenshot, the button appears to be in the bottom left
        const viewportSize = await page.viewport();
        if (viewportSize) {
          // Click where the "Continue to site" button appears to be
          await page.mouse.click(220, viewportSize.height - 120);
          console.log("Clicked at coordinates where button should be");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (coordError) {
        console.log("Error clicking by coordinates:", coordError.message);
      }
    }

    // Try a direct approach to bypass the blocking
    try {
      console.log("Attempting direct navigation to bypass blocking...");
      // Try to directly navigate to the site using a different method
      await page.evaluate((url) => {
        document.location.href = url;
      }, desiredUrl);

      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      console.log("Error with direct navigation:", error.message);
    }

    console.log("Proceeding with the rest of the script...");

    // Clicking the first 3 checkboxes
    const checkboxes = await page.$$('[data-testid="checkbox"]');
    for (let i = 0; i < Math.min(3, checkboxes.length); i++) {
      const isChecked = await (
        await checkboxes[i].getProperty("checked")
      ).jsonValue();
      if (!isChecked) {
        await checkboxes[i].click();
      }
    }
    console.log("Clicked first 3 checkboxes");

    // Selecting "Inpaint or Outpaint" button
    await page.evaluate(() => {
      const buttons = document.querySelectorAll("button");
      for (const btn of buttons) {
        if (btn.innerHTML.trim() === "Inpaint or Outpaint") {
          (btn as HTMLElement).click();
          break;
        }
      }
    });
    console.log("Clicked Inpaint or Outpaint button");

    // clicking slider to value 1
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await page.mouse.move(478, 142, { steps: 10 });
    await page.mouse.down();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await page.mouse.up();

    // await new Promise((resolve) => setTimeout(resolve, 1000));
    // await page.mouse.move(478, 142, { steps: 10 });
    // await page.mouse.down();
    // await new Promise((resolve) => setTimeout(resolve, 100));
    // await page.mouse.up();
    console.log("Set slider value to 1");

    console.log("Attempting to click radio button using exact selector...");
    try {
      await page.waitForSelector(
        'input[type="radio"][name="radio-component-217"][value="Quality"]',
        { timeout: 5000 }
      );
      await page.click(
        'input[type="radio"][name="radio-component-217"][value="Quality"]'
      );
      console.log("Clicked radio button using exact selector");
    } catch (error) {
      console.log("Could not click using exact selector:", error.message);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    // Wait to see the result before closing
    await new Promise((resolve) => setTimeout(resolve, 5000));
    // await browser.close();
  }
}
