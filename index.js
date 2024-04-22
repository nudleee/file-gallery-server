const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const multer = require("multer");
require("dotenv").config();

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const port = process.env.PORT || 8080;
const middleware = require("./src/middleware/index");
const bucket = admin.storage().bucket();
console.log(process.env);

app.use(cors({ origin: process.env.FRONTEND_URL }));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.get("/health", (_, res) => {
  res.status(200).send("Server is running");
});

app.delete("/files/:name", middleware.decodeToken, async (req, res) => {
  try {
    await bucket.file(req.params.name).delete();
    res.status(200).send("File deleted successfully");
  } catch (error) {
    res.status(500).send("Error deleting file");
  }
});

app.get("/files", async (_, res) => {
  try {
    const [files] = await bucket.getFiles();
    const promises = files.map((file) => {
      return file
        .getSignedUrl({
          action: "read",
          expires: Date.now() + 1000 * 60 * 60 * 24,
        })
        .then((url) => {
          return {
            url,
            name: file.name,
            updated: new Date(file.metadata.updated),
          };
        });
    });
    const fileUrls = await Promise.all(promises);

    const descFiles = fileUrls.sort((a, b) => {
      return a.updated.getTime() - b.updated.getTime();
    });

    res.status(200).json(descFiles);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error fetching files");
  }
});

app.post(
  "/files",
  middleware.decodeToken,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).send("No file uploaded");
        return;
      }
      const blob = bucket.file(req.body.name);
      const blobStream = blob.createWriteStream();

      blobStream.on("error", (err) => {
        res.status(500).send(err);
      });
      blobStream.on("finish", () => {
        res.status(200).send("File uploaded successfully");
      });
      blobStream.end(req.file.buffer);
    } catch (error) {
      res.status(500).send("Error uploading file");
    }
  }
);
