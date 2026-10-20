# 🚀 Blog REST API (NestJS + MongoDB)

A production-grade, secure, and scalable RESTful API for a modern blogging platform built with **NestJS**, **MongoDB (Mongoose)**, **Passport JWT**, **Nodemailer (Gmail SMTP)**, and **Cloudinary**.

Designed following **Clean Architecture**, **Domain-Driven Design principles**, and **OWASP Security Best Practices** to serve as a portfolio-ready, enterprise-grade backend showcase.

---

## 🌟 Key Features

### 🔐 1. Authentication & Authorization
- **Account Registration & Verification**:
  - Secure registration with strong password enforcement via Regex.
  - Automated 6-digit numeric OTP generation and dispatch via Gmail SMTP.
  - Cryptographically hashed OTP storage to prevent database leak vulnerabilities.
  - 10-minute expiry window for all OTP codes.
- **OTP Resend with Rate Limiting**:
  - Cooldown timer (60 seconds) prevents email spam and abuse.
- **Session & Token Management**:
  - Stateless **JWT Access Tokens** for low-latency request authentication.
  - **Refresh Token Rotation**: Long-lived refresh tokens stored as secure hashes, enabling revocation on logout or password reset.
- **Password Recovery & Modification**:
  - **Forgot Password**: Issues verification OTP via Gmail without leaking account existence (anti-enumeration protection).
  - **Reset Password**: Validates OTP and updates password, revoking all existing active sessions.
  - **Change Password**: Authenticated endpoint with mandatory current password validation.
- **Role-Based Access Control (RBAC)**:
  - Custom `@Roles(UserRole.ADMIN, ...)` decorator paired with `RolesGuard`.
  - Type-safe user extraction via custom `@ActiveUser()` param decorator.

### 📧 2. Transactional Email System (Gmail SMTP)
- Encapsulated in a dedicated, decoupled `MailModule`.
- Responsive, clean HTML email templates with fallback plaintext support.
- Built-in dev/test fallback logging to keep local development frictionless without hardcoded credentials.

### 🖼️ 3. Cloudinary Media Storage
- Streaming image uploads directly from memory buffer using Multer and Cloudinary SDK v2.
- Enforces image MIME type filtering (`image/jpeg`, `image/png`, `image/webp`) and 5MB size limit.
- Automatic cleanup of previous avatar assets when a user uploads a replacement.

### 🛡️ 4. Enterprise Standards & Security
- **Strict Environment Validation**: Managed via `@nestjs/config` and validated with `Joi` schema on startup.
- **Interactive Swagger / OpenAPI 3.0**: Fully documented request/response schemas and Bearer JWT authorization at `/api/docs`.
- **Global Pipes**: Whitelist filtering, non-whitelisted property rejection, and automatic DTO type transformation.
- **Mongoose Sanitization**: Sensitive fields (`password`, `otp`, `refreshToken`) automatically omitted in JSON output.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **NestJS 10** | Enterprise TypeScript framework |
| **MongoDB & Mongoose 8** | NoSQL database & ODM |
| **Passport & JWT** | Authentication & token strategies |
| **Bcrypt** | Cryptographic password and OTP hashing |
| **Nodemailer** | Gmail SMTP transactional email engine |
| **Cloudinary** | Cloud media storage and image optimization |
| **Joi & class-validator** | Environment and payload validation |
| **Swagger / OpenAPI** | Interactive API documentation |

---

## 📁 Architecture & Folder Structure

```text
src/
├── auth/
│   ├── decorators/         # @ActiveUser, @Roles
│   ├── dtos/               # Register, Login, VerifyOtp, ResetPassword, etc.
│   ├── enums/              # OtpPurpose
│   ├── guards/             # JwtAuthGuard, RolesGuard
│   ├── interfaces/         # ActiveUserData, TokenPayload
│   ├── providers/          # AuthService, BcryptProvider, GenerateTokensProvider
│   ├── strategies/         # JwtStrategy (Passport)
│   ├── auth.controller.ts  # All auth endpoints
│   └── auth.module.ts
├── users/
│   ├── dtos/               # UpdateProfileDto, CreateUserDto
│   ├── enums/              # UserRole
│   ├── providers/          # UsersService (CRUD, pagination)
│   ├── user.schema.ts      # Mongoose User schema with hooks
│   ├── users.controller.ts # User profile & avatar endpoints
│   └── users.module.ts
├── mail/
│   ├── mail.service.ts     # Nodemailer Gmail transport & HTML templates
│   └── mail.module.ts      # Global MailModule
├── uploads/
│   ├── cloudinary.provider.ts # Cloudinary SDK v2 config provider
│   ├── uploads.service.ts     # Buffer stream upload & asset removal
│   └── uploads.module.ts
├── posts/                  # Blog post resource module
├── tags/                   # Tag management module
├── config/                 # Joi environment validation schema
├── app.module.ts           # Root application module
└── main.ts                 # Bootstrap with Swagger & CORS
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.x or v20.x+)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas URI)

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd blog-mongo
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root based on `.env.example`:

```bash
cp .env.example .env
```

Fill in your configuration:
```env
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
MONGODB_NAME=blog-app

# JWT Secrets
JWT_SECRET=your_super_secret_access_key
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your_super_secret_refresh_key
JWT_REFRESH_EXPIRES_IN=7d

# Gmail SMTP Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_16_char_gmail_app_password
MAIL_FROM="Blog Platform" <no-reply@blogapp.com>

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

> **Tip for Gmail**: Generate an App Password at [Google Account > App Passwords](https://myaccount.google.com/apppasswords) after enabling 2-Step Verification.

### 3. Run the Application
```bash
# Development (with auto-reload)
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start:prod
```

### 4. Interactive Swagger Documentation
Once running, open your browser and navigate to:
```text
http://localhost:3000/api/docs
```
You can test all endpoints, authenticate with Bearer tokens, and upload media directly from the Swagger UI.

---

## 📡 API Reference Summary

### Authentication (`/auth`)
| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `POST` | `/auth/register` | Register new account and send OTP via Gmail | ❌ |
| `POST` | `/auth/verify-account` | Verify account using 6-digit OTP | ❌ |
| `POST` | `/auth/resend-otp` | Resend verification OTP (60s cooldown) | ❌ |
| `POST` | `/auth/login` | Authenticate with email/password; returns JWT | ❌ |
| `POST` | `/auth/refresh-token` | Obtain fresh access token via refresh token | ❌ |
| `POST` | `/auth/forgot-password` | Request password reset OTP | ❌ |
| `POST` | `/auth/reset-password` | Reset password using valid OTP | ❌ |
| `PATCH` | `/auth/change-password` | Change password with current password check | 🔒 (Bearer) |
| `GET` | `/auth/me` | Fetch authenticated user profile | 🔒 (Bearer) |

### Users (`/users`)
| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `PATCH` | `/users/profile` | Update profile info & upload Cloudinary avatar | 🔒 (Bearer) |
| `GET` | `/users/profile/me` | Get profile of logged-in user | 🔒 (Bearer) |
| `GET` | `/users/:id` | Fetch public user profile by ID | ❌ |
| `GET` | `/users` | Paginated list of users (`?limit=10&page=1`) | 🔒 (Admin Only) |

### Posts (`/posts`)
| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `GET` | `/posts` | Paginated posts list with filters (`status`, `search`, etc.) | ❌ |
| `GET` | `/posts/:id` | Fetch single post by MongoDB ObjectId | ❌ |
| `GET` | `/posts/slug/:slug` | Fetch single post by unique URL slug | ❌ |
| `POST` | `/posts` | Create new post with Cloudinary featured image | 🔒 (Bearer) |
| `PATCH` | `/posts/:id` | Update post content & featured image (Author or Admin) | 🔒 (Bearer) |
| `DELETE` | `/posts/:id` | Delete post & remove Cloudinary asset (Author or Admin) | 🔒 (Bearer) |

### Tags (`/tags`)
| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `GET` | `/tags` | Paginated tags list with keyword search (`?search=nestjs`) | ❌ |
| `GET` | `/tags/:id` | Fetch tag by MongoDB ObjectId | ❌ |
| `GET` | `/tags/slug/:slug` | Fetch tag by unique slug | ❌ |
| `POST` | `/tags` | Create new tag with optional slug auto-generation | 🔒 (Bearer) |
| `PATCH` | `/tags/:id` | Update tag name, slug, or description | 🔒 (Bearer) |
| `DELETE` | `/tags/:id` | Delete a tag | 🔒 (Bearer) |

---

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
