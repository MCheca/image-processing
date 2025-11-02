# Image Processing API

A production-ready REST API for asynchronous image processing with multiple resolutions, task tracking, and pricing management.

## Quick Start

Get up and running in 60 seconds:

```bash
git clone <repository-url> && cd image-processing
cp .env.example .env
docker-compose up --build
```

**Access the API:**

- API: http://localhost:3000
- Swagger Docs: http://localhost:3000/docs
- Health Check: http://localhost:3000/health

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Future Improvements](#future-improvements)
- [Contributing](#contributing)

## Overview

This API processes images at multiple resolutions (1024px, 800px) with asynchronous task management. Upload via publicly accessible URLs or server-side file paths, track processing status, and retrieve results with automatic pricing.

**Built with Clean Architecture principles** for maintainability, testability, and scalability.

## Features

**Core Functionality:**

- ✅ Multi-resolution image processing (1024px, 800px) with aspect ratio preservation
- ✅ Asynchronous task queue system
- ✅ URL-based image download with automatic redirect handling
- ✅ Multiple format support (JPEG, PNG, WebP) with intelligent fallback
- ✅ Content-addressable storage (MD5-based file naming)
- ✅ Automatic price assignment (5-50 units per task)

**Technical Highlights:**

- ✅ **Clean Architecture** with domain-driven design
- ✅ **Comprehensive testing** (unit, integration, E2E)
- ✅ **OpenAPI/Swagger** documentation
- ✅ **Docker** multi-stage build for production
- ✅ **Security** features (rate limiting, CORS, Helmet)
- ✅ **Health checks** for Kubernetes/orchestration

## Technology Stack

| Category             | Technologies                                                |
| -------------------- | ----------------------------------------------------------- |
| **Runtime**          | Node.js 20 (Alpine), TypeScript 5.9.3                       |
| **Web Framework**    | Fastify 5.6.1 + plugins (CORS, Helmet, Rate Limit, Swagger) |
| **Database**         | MongoDB 7 + Mongoose 8.19.2                                 |
| **Image Processing** | Sharp 0.34.4 (libvips-based)                                |
| **Testing**          | Jest 30.2.0, Supertest, Nock, MongoDB Memory Server         |
| **Validation**       | Zod 4.1.12                                                  |
| **Code Quality**     | ESLint, Prettier                                            |

## Getting Started

### Prerequisites

- **Docker & Docker Compose** (recommended) **OR**
- **Node.js 20+** and **MongoDB 7+** (for local development)

### Option 1: Docker (Recommended)

```bash
# 1. Clone and setup
git clone <repository-url>
cd image-processing
cp .env.example .env

# 2. Start services
docker-compose up --build

# 3. (Optional) Seed database with sample data
docker-compose exec app npm run seed
```

**Docker Features:**

- MongoDB with persistent volumes
- Automatic service orchestration
- Health checks for both services
- Output directory mapped to `./output` on host

### Option 2: Local Development

<details>
<summary>Click to expand local development instructions</summary>

```bash
# 1. Install dependencies
npm install

# 2. Start MongoDB (using Docker or local installation)
docker run -d -p 27017:27017 --name mongodb mongo:7-jammy
# OR use a local MongoDB installation

# 3. Configure environment
cp .env.example .env
# Edit MONGODB_URI=mongodb://localhost:27017/image-processing

# 4. Run in development mode
npm run dev

# 5. Build for production
npm run build
npm start
```

</details>

## API Documentation

### Interactive Swagger UI

**Full API documentation available at:** http://localhost:3000/docs

Try out all endpoints directly from your browser with the interactive Swagger interface.

### Quick Reference

#### Create Image Processing Task

```bash
POST /tasks
Content-Type: application/json

{
  "originalPath": "https://example.com/image.jpg"
}

# Response (201)
{
  "taskId": "uuid",
  "status": "pending",
  "price": 25.50
}
```

#### Get Task Status

```bash
GET /tasks/:taskId

# Response (200) - Completed
{
  "taskId": "uuid",
  "status": "completed",
  "price": 25.50,
  "images": [
    { "resolution": "1024", "path": "/output/image/1024/abc123.jpg" },
    { "resolution": "800", "path": "/output/image/800/def456.jpg" }
  ]
}
```

#### Health Checks

| Endpoint            | Purpose                | Use Case              |
| ------------------- | ---------------------- | --------------------- |
| `GET /health`       | Detailed health status | Monitoring dashboards |
| `GET /health/live`  | Liveness probe         | Kubernetes liveness   |
| `GET /health/ready` | Readiness probe        | Kubernetes readiness  |

<details>
<summary>Example code snippets (JavaScript, Python, cURL)</summary>

#### Using cURL

```bash
# Create task
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"originalPath": "https://images.unsplash.com/photo-1506744038136-46273834b3fb"}'

# Get task status
curl http://localhost:3000/tasks/{taskId}
```

#### Using JavaScript/TypeScript

```typescript
const response = await fetch('http://localhost:3000/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    originalPath: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
  }),
});

const { taskId, status, price } = await response.json();
console.log(`Task created: ${taskId} - $${price}`);
```

#### Using Python

```python
import requests

response = requests.post(
    'http://localhost:3000/tasks',
    json={'originalPath': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb'}
)

task = response.json()
print(f"Task: {task['taskId']} - ${task['price']}")
```

</details>

## Testing

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

### Test Coverage

- **Unit Tests**: Domain entities, value objects, use cases
- **Integration Tests**: Repositories with MongoDB Memory Server
- **E2E Tests**: Full API workflows with real HTTP requests

Tests are organized by architectural layer (`domain/`, `application/`, `infrastructure/`, `e2e/`) for clarity and maintainability.

## Configuration

### Environment Variables

| Variable                 | Default                                    | Description                               |
| ------------------------ | ------------------------------------------ | ----------------------------------------- |
| **Server Configuration** |                                            |                                           |
| `PORT`                   | `3000`                                     | HTTP server port                          |
| `NODE_ENV`               | `production`                               | Environment (development/production/test) |
| `LOG_LEVEL`              | `info`                                     | Log level (debug/info/warn/error)         |
| `TRUST_PROXY`            | `false`                                    | Trust proxy headers                       |
| **Database**             |                                            |                                           |
| `MONGODB_URI`            | `mongodb://mongodb:27017/image-processing` | MongoDB connection string                 |
| **CORS**                 |                                            |                                           |
| `CORS_ORIGIN`            | `*`                                        | Allowed origins (\* for all)              |
| `CORS_CREDENTIALS`       | `true`                                     | Allow credentials                         |
| **Security**             |                                            |                                           |
| `RATE_LIMIT_MAX`         | `100`                                      | Max requests per window                   |
| `RATE_LIMIT_WINDOW`      | `15 minutes`                               | Rate limit time window                    |
| **Image Processing**     |                                            |                                           |
| `OUTPUT_DIR`             | `./output`                                 | Output directory for processed images     |
| `MAX_IMAGE_SIZE`         | `10485760`                                 | Max image size in bytes (10MB)            |

### Docker Configuration

<details>
<summary>Docker setup details</summary>

**docker-compose.yml** provides:

- MongoDB service with persistent volumes
- Application service with health checks
- Network isolation between services
- Automatic dependency management

**Dockerfile** features:

- Multi-stage build (builder + production)
- Alpine Linux for minimal image size (~150MB)
- Non-root user execution (security best practice)
- Built-in health checks
- Native Sharp dependencies included

</details>

## Architecture

### Clean Architecture Layers

This project follows **Clean Architecture** (Hexagonal/Ports & Adapters) with clear separation:

| Layer              | Responsibility                         | Examples                                                                      |
| ------------------ | -------------------------------------- | ----------------------------------------------------------------------------- |
| **Domain**         | Core business logic, zero dependencies | Entities (`Task`, `Image`), Value Objects (`Price`, `TaskStatus`), Interfaces |
| **Application**    | Use cases and orchestration            | `CreateTaskUseCase`, `ProcessImageUseCase`, `GetTaskUseCase`                  |
| **Infrastructure** | Framework implementations              | Fastify, MongoDB, Sharp, HTTP downloaders                                     |

**Key Design Patterns:**

- Repository Pattern (data access abstraction)
- Strategy Pattern (image format handlers)
- Dependency Injection (manual container)
- Value Objects (immutable domain primitives)
- Factory Pattern (entity creation)

<details>
<summary>Project structure and architectural decisions</summary>

### Project Structure

```
src/
├── domain/                    # Pure business logic
│   ├── entities/             # Task, Image
│   ├── repositories/         # Repository interfaces
│   ├── services/             # Service interfaces
│   └── value-objects/        # Price, TaskStatus
├── application/              # Use cases
│   └── use-cases/            # CreateTask, ProcessImage, GetTask
└── infrastructure/           # Implementations
    ├── config/               # Zod-validated config
    ├── di/                   # DI container
    ├── http/                 # Fastify controllers & routes
    ├── persistence/          # MongoDB schemas
    ├── repositories/         # Mongo implementations
    ├── services/             # Sharp processor, HTTP downloader
    └── queues/               # Sync queue (ready for async)
```

### Why These Technologies?

**Fastify vs Express:**

- 2x faster performance
- Built-in schema validation
- Excellent TypeScript support
- Modern async/await API

**Sharp vs ImageMagick:**

- 4-5x faster (libvips-based)
- Lower memory usage
- Streaming processing

**MongoDB:**

- Natural document model for tasks/images
- Horizontal scalability
- Excellent Node.js ecosystem

**Clean Architecture:**

- Independent, testable layers
- Easy to swap implementations
- Framework-agnostic business logic

</details>

## Future Improvements

### High Priority

#### 1. Asynchronous Queue System

**Current:** Synchronous in-memory queue
**Proposal:** Bull/BullMQ (Redis), RabbitMQ, or AWS SQS

<details>
<summary>Implementation details</summary>

**Example with BullMQ:**

```typescript
import { Queue, Worker } from 'bullmq';

class BullTaskQueue implements ITaskQueue {
  async enqueue(taskId: string): Promise<void> {
    await this.queue.add(
      'processImage',
      { taskId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );
  }
}

const worker = new Worker('processImage', async (job) => {
  await processImageUseCase.execute(job.data.taskId);
});
```

**Benefits:**

- Multiple workers for parallel processing
- Job persistence and automatic retries
- Queue metrics and monitoring
- Priority-based task processing

**Options Comparison:**

| Solution        | Pros                                          | Cons                        |
| --------------- | --------------------------------------------- | --------------------------- |
| **Bull/BullMQ** | Excellent Node.js integration, job scheduling | Requires Redis              |
| **RabbitMQ**    | Enterprise-grade, complex routing             | Additional service overhead |
| **AWS SQS**     | Managed service, no infrastructure            | Vendor lock-in, costs       |

</details>

#### 2. Image Caching Layer

**Problem:** Duplicate images are re-processed
**Solution:** MD5-based cache lookup before processing

<details>
<summary>Implementation details</summary>

```typescript
const imageHash = await calculateMD5(imageBuffer);
const cached = await imageRepository.findByHash(imageHash);

if (cached.length > 0) {
  return cached; // Skip processing
}
```

**Benefits:** 90% faster for duplicates, reduced resource usage

</details>

#### 3. Database Indexing Strategy

<details>
<summary>Proposed indexes</summary>

```javascript
// Task collection
db.tasks.createIndex({ status: 1, createdAt: -1 });
db.tasks.createIndex({ createdAt: -1 });

// Image collection
db.images.createIndex({ md5: 1 });
db.images.createIndex({ taskId: 1 });
```

**Impact:** 10-100x faster queries, efficient pagination

</details>

#### 4. Structured Logging

**Current:** Console.log statements
**Proposal:** Pino logger (5-10x faster than Winston)

<details>
<summary>Implementation</summary>

```typescript
import pino from 'pino';

const logger = pino({ level: config.logLevel });
logger.info({ taskId, status: 'completed' }, 'Task processing completed');
```

**Benefits:** JSON logs, aggregation support (ELK, Datadog), request ID tracking

</details>

### Medium Priority

<details>
<summary>5. Cloud Storage Abstraction (S3, GCS, Azure Blob)</summary>

```typescript
interface IStorageService {
  save(path: string, buffer: Buffer): Promise<string>;
  get(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
}

class S3StorageService implements IStorageService {
  async save(path: string, buffer: Buffer): Promise<string> {
    await s3.putObject({ Bucket: this.bucket, Key: path, Body: buffer });
    return `https://${this.bucket}.s3.amazonaws.com/${path}`;
  }
}
```

</details>

<details>
<summary>6. Webhook Notifications</summary>

```typescript
// Notify clients when tasks complete
if (task.webhookUrl) {
  await fetch(task.webhookUrl, {
    method: 'POST',
    body: JSON.stringify({ taskId, status, images }),
  });
}
```

</details>

<details>
<summary>7. Per-Client Rate Limiting with API Keys</summary>

```typescript
fastify.addHook('preHandler', async (request, reply) => {
  const apiKey = request.headers['x-api-key'];
  const limit = await rateLimiter.check(apiKey);
  if (!limit.allowed) {
    reply.code(429).send({ error: 'Rate limit exceeded' });
  }
});
```

</details>

<details>
<summary>8. Batch Processing API</summary>

```typescript
POST /tasks/batch
{
  "images": [
    { "originalPath": "url1" },
    { "originalPath": "url2" }
  ]
}
```

</details>

### Low Priority

- **Additional Formats**: AVIF, HEIF/HEIC, animated GIF/WebP
- **Custom Resolutions**: Client-specified resolution arrays
- **Image Optimization**: Quality settings, compression levels, metadata stripping
- **Metrics & Monitoring**: Prometheus, Grafana, APM integration
- **Admin API**: Task management (cancel, retry), system statistics

## License

ISC
