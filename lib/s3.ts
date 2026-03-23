import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import type { LeagueData } from "./types";

function getS3Client(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

function getBucketName(): string {
  return process.env.S3_BUCKET_NAME ?? "fantasy-baseball-dashboard-729529543";
}

export async function writeRawData(data: unknown, date: string): Promise<void> {
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: `raw/${date}.json`,
      Body: JSON.stringify(data),
      ContentType: "application/json",
    })
  );
}

export async function writeProcessedData(
  data: LeagueData,
  date: string
): Promise<void> {
  const client = getS3Client();
  const bucket = getBucketName();
  const body = JSON.stringify(data);

  await Promise.all([
    client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: "processed/latest.json",
        Body: body,
        ContentType: "application/json",
      })
    ),
    client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `processed/snapshots/${date}.json`,
        Body: body,
        ContentType: "application/json",
      })
    ),
  ]);
}

export async function readLatestLeagueData(): Promise<LeagueData | null> {
  const client = getS3Client();
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: getBucketName(),
        Key: "processed/latest.json",
      })
    );
    const body = await response.Body?.transformToString();
    if (!body) return null;
    return JSON.parse(body) as LeagueData;
  } catch (err: unknown) {
    const code = (err as { name?: string }).name;
    if (code === "NoSuchKey" || code === "AccessDenied") return null;
    throw err;
  }
}

export async function writeHistoricalData(
  data: unknown,
  year: number
): Promise<void> {
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: `raw/historical/${year}.json`,
      Body: JSON.stringify(data),
      ContentType: "application/json",
    })
  );
}

export async function readHistoricalData(year: number): Promise<unknown | null> {
  const client = getS3Client();
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: getBucketName(),
        Key: `raw/historical/${year}.json`,
      })
    );
    const body = await response.Body?.transformToString();
    if (!body) return null;
    return JSON.parse(body);
  } catch (err: unknown) {
    const code = (err as { name?: string }).name;
    if (code === "NoSuchKey" || code === "AccessDenied") return null;
    throw err;
  }
}
