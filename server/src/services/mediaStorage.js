import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { uploadsDirectory, sanitizeFilename } from "../middleware/upload.js";

const buildObjectUrl = (bucket, region, key) => {
  const encodedKey = encodeURIComponent(key).replace(/%2F/g, "/");
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
};

const createStoredFileName = (originalName) => {
  const safeName = sanitizeFilename(originalName);
  return `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
};

const getS3UploadConfig = () => {
  const bucket = process.env.AWS_S3_UPLOAD_BUCKET || process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;
  const prefix = (process.env.AWS_S3_UPLOAD_PREFIX || "uploads").replace(/^\/+|\/+$/g, "");
  const publicBaseUrl = (process.env.AWS_S3_PUBLIC_BASE_URL || "").replace(/\/+$/, "");

  if (!bucket || !region) {
    return null;
  }

  return {
    bucket,
    region,
    prefix,
    publicBaseUrl,
  };
};

const createS3Client = ({ region }) =>
  new S3Client({
    region,
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  });

const persistToS3 = async (file) => {
  const uploadConfig = getS3UploadConfig();

  if (!uploadConfig) {
    return null;
  }

  const storedFileName = createStoredFileName(file.originalname);
  const key = uploadConfig.prefix ? `${uploadConfig.prefix}/${storedFileName}` : storedFileName;

  const client = createS3Client(uploadConfig);
  await client.send(
    new PutObjectCommand({
      Bucket: uploadConfig.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  return {
    storedFileName,
    mediaUrl: uploadConfig.publicBaseUrl
      ? `${uploadConfig.publicBaseUrl}/${key}`
      : buildObjectUrl(uploadConfig.bucket, uploadConfig.region, key),
    mediaType: file.mimetype,
    metadata: {
      storage: "s3",
      bucket: uploadConfig.bucket,
      key,
    },
  };
};

const persistToLocalDisk = async (file) => {
  const storedFileName = createStoredFileName(file.originalname);
  const targetPath = path.join(uploadsDirectory, storedFileName);

  await fs.mkdir(uploadsDirectory, { recursive: true });
  await fs.writeFile(targetPath, file.buffer);

  return {
    storedFileName,
    mediaUrl: `/uploads/${storedFileName}`,
    mediaType: file.mimetype,
    metadata: {
      storage: "local",
      filePath: targetPath,
    },
  };
};

export const persistUploadedImage = async (file) => {
  const s3Asset = await persistToS3(file);
  if (s3Asset) {
    return s3Asset;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Image uploads on Vercel require AWS_S3_BUCKET, AWS_REGION, and related S3 credentials so files can be stored persistently.",
    );
  }

  return persistToLocalDisk(file);
};
