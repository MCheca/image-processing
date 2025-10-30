import { randomUUID } from 'crypto';

interface ImageProps {
  id: string;
  resolution: string;
  path: string;
  md5: string;
  createdAt: Date;
}

export class Image {
  private constructor(private readonly props: ImageProps) {}

  static create(resolution: string, path: string, md5: string): Image {
    if (!resolution || resolution.trim() === '') {
      throw new Error('Resolution cannot be empty');
    }

    if (!path || path.trim() === '') {
      throw new Error('Path cannot be empty');
    }

    if (!md5 || md5.trim() === '') {
      throw new Error('MD5 hash cannot be empty');
    }

    const trimmedMd5 = md5.trim();
    if (!this.isValidMd5(trimmedMd5)) {
      throw new Error('Invalid MD5 hash format');
    }

    return new Image({
      id: randomUUID(),
      resolution: resolution.trim(),
      path: path.trim(),
      md5: trimmedMd5,
      createdAt: new Date(),
    });
  }

  static reconstitute(
    id: string,
    resolution: string,
    path: string,
    md5: string,
    createdAt: Date
  ): Image {
    return new Image({
      id,
      resolution,
      path,
      md5,
      createdAt,
    });
  }

  private static isValidMd5(hash: string): boolean {
    // MD5 hash is 32 hexadecimal characters
    const md5Regex = /^[a-fA-F0-9]{32}$/;
    return md5Regex.test(hash);
  }

  get id(): string {
    return this.props.id;
  }

  get resolution(): string {
    return this.props.resolution;
  }

  get path(): string {
    return this.props.path;
  }

  get md5(): string {
    return this.props.md5;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  getFileName(): string {
    const parts = this.props.path.split('/');
    return parts[parts.length - 1];
  }

  getExtension(): string {
    const fileName = this.getFileName();
    const dotIndex = fileName.lastIndexOf('.');

    if (dotIndex === -1) {
      return '';
    }

    return fileName.substring(dotIndex + 1);
  }

  equals(other: Image): boolean {
    if (!other) {
      return false;
    }
    return this.props.id === other.props.id;
  }

  toObject(): {
    id: string;
    resolution: string;
    path: string;
    md5: string;
    createdAt: Date;
  } {
    return {
      id: this.props.id,
      resolution: this.props.resolution,
      path: this.props.path,
      md5: this.props.md5,
      createdAt: this.props.createdAt,
    };
  }

  toDTO(): {
    resolution: string;
    path: string;
  } {
    return {
      resolution: this.props.resolution,
      path: this.props.path,
    };
  }
}
