// import axios from "axios";
// // import * as fs from "fs";
// // import * as path from "path";
// import puppeteer from "puppeteer";

// async function puppet(imageUrl: string, desiredUrl: string) {
//   try {
//     const response = await axios.get(imageUrl, { responseType: "stream" });

//     // Launch Puppeteer and open the desired URL
//     const browser = await puppeteer.launch({ headless: false });
//     const page = await browser.newPage();
//     await page.setViewport({ width: 1300, height: 700 });
//     await page.setUserAgent(
//       "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36"
//     );

//     await page.goto(desiredUrl);

//     //clicking the first 3 check boxes
//     const checkboxes = await page.$$('[data-testid="checkbox"]');
//     for (let i = 0; i < Math.min(3, checkboxes.length); i++) {
//       const isChecked = await (
//         await checkboxes[i].getProperty("checked")
//       ).jsonValue();
//       if (!isChecked) {
//         await checkboxes[i].click();
//       }
//     }

//     //selecting inpaint outpaint
//     await page.evaluate(() => {
//       const buttons = document.querySelectorAll("button");
//       for (const btn of buttons) {
//         if (btn.innerHTML.trim() === "Inpaint or Outpaint") {
//           (btn as HTMLElement).click();
//           break;
//         }
//       }
//     });

//     //setting slider to one
//     await page.evaluate(() => {
//       const slider = document.querySelector(
//         'input[type="range"]'
//       ) as HTMLInputElement;
//       if (slider) {
//         slider.value = "1"; // Set the desired value
//         slider.dispatchEvent(new Event("input", { bubbles: true }));
//         slider.dispatchEvent(new Event("change", { bubbles: true }));
//       }
//     });

//     await page.waitForSelector('input[type="file"]');
//     const fileInput = await page.$('input[type="file"]');

//     // Uploading the image file
//     await fileInput.uploadFile(response); // 'response' should be a valid file path

//     // Click the upload button
//     await page.waitForSelector("#upload");
//     await page.click("#upload");

//     // Wait for the uploaded image URL to appear
//     await page.waitForSelector("#upload-link", { timeout: 10000 });

//     const screenshotPath = "./screenshot.png";
//     await page.screenshot({ path: screenshotPath });

//     console.log(`Screenshot saved at ${screenshotPath}`);

//     await browser.close();
//   } catch (error) {
//     console.error("Error:", error);
//   }
// }

// puppet(
//   "https://00bknuqmck.ufs.sh/f/DrDDb60yFzNPXvJmxAPr3VTkjhSdUvzuZf2QelKIi0YHPAB6",
//   "http://35.247.134.171/?"
// );

import axios from "axios";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

export async function puppet(imageUrl: string, desiredUrl: string) {
  try {
    // Download image and save to disk
    const response = await axios.get(imageUrl, { responseType: "stream" });
    const filePath = path.resolve(__dirname, "temp-image.png");
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    // await new Promise((resolve, reject) => {
    //   writer.on("finish", resolve);
    //   writer.on("error", reject);
    // });

    // Launch Puppeteer and open the desired URL
    const browser = await puppeteer.launch({
      headless: false,
      args: ["--ignore-certificate-errors"],
      // ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1300, height: 700 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.60 Safari/537.36 Brave/124"
    );

    await page.goto(desiredUrl);

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

    // Setting slider to value 1
    await page.evaluate(() => {
      const slider = document.querySelector(
        'input[type="range"]'
      ) as HTMLInputElement;
      if (slider) {
        slider.value = "1";
        slider.dispatchEvent(new Event("input", { bubbles: true }));
        slider.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    // Uploading the file
    await page.waitForSelector('input[type="file"]');
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error("File input not found");
    }
    await fileInput.uploadFile(filePath);

    // Click the upload button
    await page.waitForSelector("#upload");
    await page.click("#upload");

    // Wait for the uploaded image URL to appear
    await page.waitForSelector("#upload-link", { timeout: 10000 });

    // Take a screenshot
    const screenshotPath = "./screenshot.png";
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved at ${screenshotPath}`);

    await browser.close();

    // Optional: delete temp file
    fs.unlinkSync(filePath);
  } catch (error) {
    console.error("Error:", error);
  }
}

// puppet(
//   "https://00bknuqmck.ufs.sh/f/DrDDb60yFzNPXvJmxAPr3VTkjhSdUvzuZf2QelKIi0YHPAB6",
//   "http://35.247.134.171/?"
// );

// Add event listeners to catch and log errors
page.on("error", (err) => {
  console.error("Page error:", err);
});

page.on("pageerror", (err) => {
  console.error("Page error:", err);
});

page.on("console", (msg) => {
  console.log("Page console:", msg.text());
});

// Navigate with a timeout and retry mechanism
let loaded = false;
let attempts = 0;

while (!loaded && attempts < 3) {
  try {
    console.log(`Attempt ${attempts + 1} to navigate to ${desiredUrl}`);
    await page.goto(desiredUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    loaded = true;
  } catch (error) {
    console.error(`Navigation error (attempt ${attempts + 1}):`, error);
    attempts++;
    if (attempts >= 3) {
      throw new Error(`Failed to load page after ${attempts} attempts`);
    }
    await new Promise((r) => setTimeout(r, 2000)); // Wait 2 seconds before retrying
  }
}

console.log(3);
// Wait for page to be properly loaded
await page.waitForTimeout(2000);

// Clicking the first 3 checkboxes
try {
  let checkboxes = await page.$$('[data-testid="checkbox"]');
  if (checkboxes.length === 0) {
    console.log("No checkboxes found, waiting longer and trying again");
    await page.waitForTimeout(3000);
    checkboxes = await page.$$('[data-testid="checkbox"]');
  }

  for (let i = 0; i < Math.min(3, checkboxes.length); i++) {
    const isChecked = await (
      await checkboxes[i].getProperty("checked")
    ).jsonValue();
    if (!isChecked) {
      await checkboxes[i].click();
      await page.waitForTimeout(300); // Small delay between clicks
    }
  }
} catch (error) {
  console.error("Error clicking checkboxes:", error);
}

// Selecting "Inpaint or Outpaint" button
try {
  await page.evaluate(() => {
    const buttons = document.querySelectorAll("button");
    for (const btn of buttons) {
      if (btn.innerHTML.trim() === "Inpaint or Outpaint") {
        (btn as HTMLElement).click();
        break;
      }
    }
  });
  await page.waitForTimeout(1000);
} catch (error) {
  console.error("Error clicking Inpaint or Outpaint button:", error);
}

// Setting slider to value 1
try {
  await page.evaluate(() => {
    const slider = document.querySelector(
      'input[type="range"]'
    ) as HTMLInputElement;
    if (slider) {
      slider.value = "1";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      console.error("Slider not found");
    }
  });
  await page.waitForTimeout(500);
} catch (error) {
  console.error("Error setting slider value:", error);
}

// Uploading the file
try {
  console.log("Waiting for file input...");
  await page.waitForSelector('input[type="file"]', { timeout: 5000 });
  const fileInput = await page.$('input[type="file"]');
  if (!fileInput) {
    throw new Error("File input not found");
  }

  console.log(`Uploading file from ${filePath}`);
  await fileInput.uploadFile(filePath);
  await page.waitForTimeout(1000);
} catch (error) {
  console.error("Error uploading file:", error);
  // Take screenshot to help debug
  await page.screenshot({ path: "./error-upload.png" });
  throw error;
}

// Click the upload button
try {
  console.log("Clicking upload button");
  await page.waitForSelector("#upload", { timeout: 5000 });
  await page.click("#upload");
} catch (error) {
  console.error("Error clicking upload button:", error);
  await page.screenshot({ path: "./error-upload-button.png" });
  throw error;
}

// Wait for the uploaded image URL to appear
try {
  console.log("Waiting for upload link to appear");
  await page.waitForSelector("#upload-link", { timeout: 15000 });
  const uploadedUrl = await page.$eval("#upload-link", (el) => el.textContent);
  console.log("Uploaded image URL:", uploadedUrl);
} catch (error) {
  console.error("Error waiting for upload link:", error);
}
