import axios from "axios";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

export async function puppet(
  imageUrl: string,
  desiredUrl: string,
  coordinates: Record<string, any>
) {
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
    // await page.evaluate(() => {
    //   window.scrollTo(0, 0);
    // });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await page.mouse.move(478, 142, { steps: 10 });
    await page.mouse.down();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await page.mouse.up();

    console.log("Set slider value to 1");

    // clicking quality button
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

    // Wait to ensure UI is ready for file upload
    console.log("Waiting for UI to stabilize before file upload...");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    // Download the image from the URL to a temporary file
    console.log("Downloading image from URL:", imageUrl);
    try {
      // Create a temporary directory if it doesn't exist
      const tempDir = path.join(__dirname, "../../temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      console.log("Temp directory created/verified at:", tempDir);

      // Download the image
      console.log("Attempting to download image from:", imageUrl);
      const response = await axios({
        url: imageUrl,
        method: "GET",
        responseType: "arraybuffer",
      });
      console.log("Image download response received, status:", response.status);

      // Generate a unique filename
      const timestamp = new Date().getTime();
      const tempFilePath = path.join(tempDir, `temp_image_${timestamp}.jpg`);

      // Save the image to the temporary file
      fs.writeFileSync(tempFilePath, Buffer.from(response.data, "binary"));
      console.log("Image downloaded to:", tempFilePath);
      console.log("File size:", fs.statSync(tempFilePath).size, "bytes");

      // Specifically target the Svelte file uploader structure based on the HTML provided by the user
      try {
        // Get all file inputs on the page
        const fileInputs = await page.$$('input[type="file"]');
        console.log(`Found ${fileInputs.length} file input elements`);

        if (fileInputs.length >= 6) {
          // Target the 6th file input (index 5)
          await fileInputs[5].uploadFile(tempFilePath);
          console.log("File uploaded successfully to 6th file input");
        } else {
          console.log("Less than 6 file inputs found");
          await page.screenshot({ path: "./not_enough_inputs.png" });
        }
      } catch (error) {
        console.error("Error uploading via hidden input:", error);
        await page.screenshot({ path: "./hidden_input_error.png" });
      }

      // Take a screenshot to see the state after upload attempt
      const screenshotPath = path.join(
        __dirname,
        "../../temp",
        `upload_result_${new Date().getTime()}.png`
      );
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log("Upload result screenshot saved to:", screenshotPath);

      // Delete the temporary file after successful upload
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
          console.log("Temporary file deleted successfully:", tempFilePath);
        } else {
          console.log("Temporary file not found for deletion:", tempFilePath);
        }
      } catch (deleteError) {
        console.error("Error deleting temporary file:", deleteError);
      }

      await page.click('button[aria-label="Use brush"]');

      await page.evaluate(() => {
        window.scrollTo(8, 589);
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await page.mouse.move(378, 88, { steps: 10 });
      await page.mouse.down();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await page.mouse.up();

      await page.click('button[aria-label="Use brush"]');
      //masking
      console.log("Masking...attempt");
      const scaleX = 332 / 5464;
      const scaleY = 498 / 8192;

      //bottom-left
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await page.mouse.move(
        40 + coordinates.center.x * scaleX,
        97 + coordinates.top_left.y * scaleY,
        { steps: 10 }
      );
      await page.mouse.down();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await page.mouse.up();

      //bottom-right
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await page.mouse.move(
        90 + coordinates.center.x * scaleX,
        97 + coordinates.top_left.y * scaleY,
        { steps: 10 }
      );
      await page.mouse.down();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await page.mouse.up();

      //top-left
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await page.mouse.move(
        45 + coordinates.center.x * scaleX,
        74 + coordinates.top_left.y * scaleY,
        { steps: 10 }
      );
      await page.mouse.down();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await page.mouse.up();

      //top-right
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await page.mouse.move(
        85 + coordinates.center.x * scaleX,
        74 + coordinates.top_left.y * scaleY,
        { steps: 10 }
      );
      await page.mouse.down();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await page.mouse.up();

      //top-center
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await page.mouse.move(
        66 + coordinates.center.x * scaleX,
        74 + coordinates.top_left.y * scaleY,
        { steps: 10 }
      );
      await page.mouse.down();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await page.mouse.up();

      //writing the prompt
      // Wait for all textareas to load
      await page.waitForSelector("textarea");

      // Type in the first visible textarea
      await page.evaluate(() => {
        const textareas = document.querySelectorAll("textarea");
        if (textareas.length > 0) {
          textareas[0].focus();
        }
      });

      // Use Puppeteer to type into the first textarea
      const textareas = await page.$$("textarea");
      if (textareas.length > 0) {
        await textareas[0].type("Bald man with a chinese face and black skin");
      }
      console.log("prompt written");

      //Click on generate button
      await page.click("#generate_button");
      console.log("Generate button clicked");
    } catch (error) {
      console.error("Error in file upload process:", error);
      // Take a screenshot to see what's on the page when the error occurs
      try {
        const screenshotPath = path.join(
          __dirname,
          "../../temp",
          `error_screenshot_${new Date().getTime()}.png`
        );
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log("Error screenshot saved to:", screenshotPath);
      } catch (screenshotError) {
        console.error("Failed to take error screenshot:", screenshotError);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    // Wait to see the result before closing
    await new Promise((resolve) => setTimeout(resolve, 5000));
    // await browser.close();
  }
}
