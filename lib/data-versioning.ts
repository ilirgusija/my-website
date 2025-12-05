import { put, head } from '@vercel/blob';
import { createHash } from 'crypto';

// In-memory cache for versioned data to avoid repeated fetches during build/request
const dataCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

export interface DataVersion {
  timestamp: number;
  checksum: string;
  recordCount: number;
  version: string;
}

export interface VersionedData<T> {
  data: T;
  version: DataVersion;
}

// Generate a unique version string
export function generateVersion(): string {
  return `v${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate checksum for data
export function generateChecksum(data: any): string {
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  return createHash('md5').update(dataString).digest('hex');
}

// Upload versioned data
export async function uploadVersionedData<T>(
  data: T, 
  path: string, 
  contentType: string = 'application/json'
): Promise<DataVersion> {
  const version: DataVersion = {
    timestamp: Date.now(),
    checksum: generateChecksum(data),
    recordCount: Array.isArray(data) ? data.length : 1,
    version: generateVersion()
  };

  const versionedData: VersionedData<T> = {
    data,
    version
  };

  await put(path, JSON.stringify(versionedData, null, 2), {
    access: 'public',
    contentType,
    addRandomSuffix: false,
  });

  // Also upload version metadata separately for quick access
  await put(`${path}.version`, JSON.stringify(version, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });

  return version;
}

// Fetch versioned data
export async function fetchVersionedData<T>(path: string): Promise<VersionedData<T> | null> {
  try {
    // Check cache first
    const cached = dataCache.get(path);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as VersionedData<T>;
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("BLOB_READ_WRITE_TOKEN is not set");
    }

    // Try to get blob metadata - this will throw if blob doesn't exist
    let metadata;
    try {
      metadata = await head(path, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
    } catch (headError: any) {
      // If blob doesn't exist, that's fine - return null
      if (headError?.message?.includes("does not exist") || headError?.statusCode === 404) {
        if (process.env.NODE_ENV === 'development') {
          // Silently handle missing blobs in development
          return null;
        }
        throw headError;
      }
      throw headError;
    }

    // Fetch the actual data from the download URL
    const response = await fetch(metadata.downloadUrl);
    
    if (!response.ok) {
      // If we get Forbidden, the blob might not exist or be accessible
      if (response.status === 403 || response.status === 404) {
        if (process.env.NODE_ENV === 'development') {
          // Silently handle in development
          return null;
        }
        throw new Error(`Blob not accessible: ${response.statusText}`);
      }
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    const versionedData: VersionedData<T> = await response.json();
    
    // Validate checksum BEFORE caching to prevent corrupted data from being cached
    const expectedChecksum = generateChecksum(versionedData.data);
    if (expectedChecksum !== versionedData.version.checksum) {
      throw new Error('Data integrity check failed: checksum mismatch');
    }
    
    // Cache the result only after validation passes
    dataCache.set(path, {
      data: versionedData,
      timestamp: Date.now(),
      ttl: CACHE_TTL,
    });

    return versionedData;
  } catch (error) {
    // Only log errors in production - in development, we'll fall back to dev data
    if (process.env.NODE_ENV !== 'development') {
      console.error(`Failed to fetch versioned data from ${path}:`, error);
    }
    return null;
  }
}

// Get latest version info
export async function getLatestVersion(path: string): Promise<DataVersion | null> {
  try {
    const metadata = await head(`${path}.version`);
    const response = await fetch(metadata.downloadUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch version: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch version info from ${path}.version:`, error);
    return null;
  }
}

// Check if data needs updating
export async function needsUpdate(path: string, lastKnownVersion?: string): Promise<boolean> {
  const latestVersion = await getLatestVersion(path);
  
  if (!latestVersion) {
    return true; // No version info, assume needs update
  }

  if (!lastKnownVersion) {
    return true; // No last known version, assume needs update
  }

  return latestVersion.version !== lastKnownVersion;
}
