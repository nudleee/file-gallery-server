const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();
const AzureStorageBlob = require('@azure/storage-blob');

const upload = multer({ storage: multer.memoryStorage() });

const storageAccount = process.env.AZURE_STORAGE_ACCOUNT;
const containerName = process.env.AZURE_STORAGE_CONTAINER;
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const blobServiceClient = AzureStorageBlob.BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

const app = express();
const port = process.env.PORT || 5000;
const middleware = require('./src/middleware/index');

app.use(cors({ origin: process.env.FRONTEND_URL }));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.get('/health', (_, res) => {
  res.status(200).send('Server is running');
});

app.delete('/files/:name', middleware.decodeToken, async (req, res) => {
  try {
    await containerClient.deleteBlob(req.params.name);
    await containerClient.deleteBlob(`resized-${req.params.name}`);
    res.status(200).send('File deleted successfully');
  } catch (error) {
    res.status(500).send('Error deleting file');
  }
});

app.get('/files/:name', async (req, res) => {
  try {
    const blobName = req.params.name;
    const blobClient = await containerClient.getBlobClient(blobName);
    const blob = blobClient.getBlockBlobClient();
    const blobResponse = await blob.download(0);

    res.status(200).send({
      url: `https://${storageAccount}.blob.core.windows.net/${containerName}/${blobName}`,
      name: blobName,
      updated: blobResponse.originalResponse.lastModified,
    });
  } catch (error) {
    res.status(500).send('Error downloading file');
  }
});

app.get('/files', async (req, res) => {
  try {
    const filter = req.query.filter || 'updated';
    const order = req.query.order || 'desc';
    const blobs = containerClient.listBlobsFlat();

    const fileUrls = [];
    for await (const blob of blobs) {
      if (blob.name.includes('resized-')) {
        fileUrls.push({
          url: `https://${storageAccount}.blob.core.windows.net/${containerName}/${blob.name}`,
          name: blob.name,
          updated: blob.properties.lastModified,
        });
      }
    }
    const sortedFile = fileUrls.sort((a, b) => {
      let comparison = 0;
      if (filter === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (filter === 'updated') {
        comparison = a.updated.getTime() - b.updated.getTime();
      }
      return order === 'asc' ? comparison : -comparison;
    });

    res.status(200).json(sortedFile);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post('/files', middleware.decodeToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).send('No file uploaded');
      return;
    }
    const blobClient = containerClient.getBlockBlobClient(req.body.name);
    await blobClient.uploadData(req.file.buffer, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype },
    });

    res.status(200).send('File uploaded successfully');
  } catch (error) {
    res.status(500).send('Error uploading file');
  }
});
