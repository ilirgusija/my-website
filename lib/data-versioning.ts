import { put, head } from '@vercel/blob';

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
  const crypto = require('crypto');
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('md5').update(dataString).digest('hex');
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
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("BLOB_READ_WRITE_TOKEN is not set");
    } else {
      console.log("BLOB_READ_WRITE_TOKEN is set");
    }

    const metadata = await head(path);
    const response = await fetch(metadata.downloadUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    } else {
      console.log(`Data fetched successfully: ${response.statusText}`);
    }

    const versionedData: VersionedData<T> = await response.json();
    
    // Validate checksum
    const expectedChecksum = generateChecksum(versionedData.data);
    if (expectedChecksum !== versionedData.version.checksum) {
      throw new Error('Data integrity check failed: checksum mismatch');
    }

    return versionedData;
  } catch (error) {
    console.error(`Failed to fetch versioned data from ${path}:`, error);
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
