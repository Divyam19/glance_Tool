import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { puppet } from "../../../utils/pp";
import axios from "axios"; // You'll need to install axios if not already installed
import { taskQueue } from "../../../utils/queue";

const f = createUploadthing();

const auth = (req: Request) => ({ id: "fakeId" }); // Fake auth function

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({
    image: {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: "32MB",
      maxFileCount: 10, // Changed from 1 to 10 to allow multiple images
    },
  })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      // This code runs on your server before upload
      const user = await auth(req);

      // If you throw, the user will not be able to upload
      if (!user) throw new UploadThingError("Unauthorized");

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log("Upload complete for userId:", metadata.userId);

      console.log("file url", file.ufsUrl);

      // Make a POST request to the head detection API
      try {
        const response = await axios.post("http://localhost:8000/detect-head", {
          url: file.ufsUrl,
        });

        // Log the API response
        console.log("Head detection response:", response.data);

        // Add the puppet task to the queue for sequential processing
        taskQueue.enqueue(async () => {
          console.log(`Starting puppet process for file: ${file.name}`);
          await puppet(file.ufsUrl, "http://35.247.134.171/?", response.data);
          console.log(`Completed puppet process for file: ${file.name}`);
        });

        // You can process the response here if needed
      } catch (error) {
        console.error("Error calling head detection API:", error);
      }

      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
