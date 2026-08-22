# Abhinava

> A secure, tenant-isolated business platform built for modern jewelry businesses.

Abhinava is a multi-tenant SaaS platform designed to help jewelry businesses manage day-to-day operations through a centralized CRM and business-management system.

The platform is designed around a fundamental principle:

> **The client's business data belongs to the client and remains within the client's isolated tenant environment.**

Abhinava manages platform infrastructure, client onboarding, provisioning, subscription and platform-level metadata, while the client's operational business data is maintained inside the client's dedicated Firebase environment.

---

## Table of Contents

- [What is Abhinava?](#what-is-abhinava)
- [Core Principles](#core-principles)
- [Product Vision](#product-vision)
- [Architecture Overview](#architecture-overview)
- [Control Plane and Tenant Data Plane](#control-plane-and-tenant-data-plane)
- [Tenant Isolation](#tenant-isolation)
- [Authentication](#authentication)
- [Authorization and Roles](#authorization-and-roles)
- [Data Ownership](#data-ownership)
- [Client Onboarding](#client-onboarding)
- [Current Provisioning Flow](#current-provisioning-flow)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Backend](#backend)
- [Frontend](#frontend)
- [Database and Migrations](#database-and-migrations)
- [Firebase Architecture](#firebase-architecture)
- [Security Model](#security-model)
- [Auditability](#auditability)
- [Privacy and DPDP Alignment](#privacy-and-dpdp-alignment)
- [CRM Modules](#crm-modules)
- [Development Workflow](#development-workflow)
- [Environment Configuration](#environment-configuration)
- [Running the Project](#running-the-project)
- [Production Readiness](#production-readiness)
- [Project Status](#project-status)
- [Long-Term Vision](#long-term-vision)
- [License](#license)

---

# What is Abhinava?

Abhinava is a SaaS platform focused initially on the jewelry industry.

The platform is intended to bring important jewelry-business operations into one system, including:

- Customer management
- Product management
- Inventory
- Gold management
- Purchases
- Sales
- Vendors
- Employees
- Reports
- Business analytics
- Operational monitoring
- Future forecasting and ML capabilities

The goal is not simply to provide another CRM.

Abhinava is intended to become an operational platform for jewelry businesses.

---

# Core Principles

## 1. Client business data belongs to the client

Abhinava should not unnecessarily store a client's operational business data inside the Abhinava control-plane database.

The client's business data is maintained inside the client's isolated tenant environment.

## 2. Tenant isolation

Every client receives an isolated Firebase project.

A client's application data must never be accessible to another client's users.

```text
Client A
   |
   +-- Firebase Project A
          |
          +-- Business Data A


Client B
   |
   +-- Firebase Project B
          |
          +-- Business Data B
```

## 3. Control-plane / data-plane separation

Abhinava maintains the control plane.

The client maintains the business data plane.

```text
                    ABHINAVA
                  CONTROL PLANE
                       |
        +--------------+--------------+
        |              |              |
      Client         Tenant        Subscription
     Metadata       Provisioning     Metadata
        |
    PostgreSQL
        |
        +-----------------------------+
                                      |
                         Tenant Data Plane
                                      |
                +---------------------+---------------------+
                |                     |                     |
             Client A              Client B              Client C
             Firebase              Firebase              Firebase
                |                     |                     |
           Business Data         Business Data         Business Data
```

---

# Product Vision

The long-term objective is to provide jewelry businesses with a secure, modular business platform.

Planned product areas include:

```text
Abhinava
|
+-- CRM
+-- Customers
+-- Products
+-- Inventory
+-- Gold Management
+-- Purchases
+-- Sales
+-- Vendors
+-- Employees
+-- Reports
+-- Analytics
+-- Audit
+-- Future ML / Forecasting
```

Modules are designed to operate within the authenticated tenant context.

---

# Architecture Overview

At a high level:

```text
                         PUBLIC WEBSITE
                              |
                        Login / Demo
                              |
                 +------------+------------+
                 |                         |
          ABHINAVA LOGIN             CLIENT LOGIN
                 |                         |
                 v                         v
        ABHINAVA CONTROL PLANE       TENANT CRM
                 |                         |
                 |                    Tenant Firebase
                 |                         |
                 v                         v
             PostgreSQL               Firestore
```

The platform contains two fundamentally different environments.

## Abhinava Control Plane

Responsible for:

- Client onboarding
- Client metadata
- Tenant identification
- Firebase provisioning
- Subscription metadata
- Platform administration
- Provisioning status
- Platform-level audit information
- Infrastructure maintenance

## Client Data Plane

Responsible for:

- Customers
- Products
- Inventory
- Gold records
- Sales
- Purchases
- Vendors
- Employees
- Business reports
- Other operational business information

The client data plane belongs to the respective tenant.

---

# Control Plane and Tenant Data Plane

## Control Plane

The Abhinava PostgreSQL database contains client onboarding and platform-level information.

Examples:

- Client ID
- Tenant ID
- Business name
- Legal business name
- Owner information
- Contact information
- Subscription information
- Domain
- Enabled modules
- Firebase project ID
- Firebase Web App ID
- Provisioning status
- Provisioning error
- Provisioned timestamp
- Platform audit information

The control plane should not become a repository for the client's operational business data.

## Tenant Data Plane

Each client receives an isolated Firebase project.

Example:

```text
Sakteesawar
    |
    +-- Firebase Project
            |
            +-- Authentication
            +-- Firestore
            +-- Storage
            +-- Web App
```

The tenant data plane contains the actual business data.

---

# Tenant Isolation

Tenant isolation is a core security requirement.

A user must always operate within a tenant context.

```text
User
 |
 +-- Tenant
      |
      +-- Role
           |
           +-- Permissions
                |
                +-- Business Data
```

The application must never rely solely on frontend routing to enforce tenant isolation.

Tenant authorization must be enforced using backend authorization and Firebase Security Rules where applicable.

---

# Authentication

Authentication is tenant-aware.

The platform currently uses Google authentication through Firebase Authentication for the tenant authentication proof-of-concept.

## Abhinava users

Abhinava employees authenticate through the Abhinava authentication boundary.

Example:

```text
sudhamsha@abhinava.site
```

These users access the Abhinava control plane.

## Client users

Client users authenticate through their tenant environment.

The current reference tenant is Sakteesawar.

Example test user:

```text
sudhamshasagar@gmail.com
```

Client employees will authenticate against their respective tenant environment.

---

# Authentication Flow

The intended client flow is:

```text
Client Login
      |
      v
Tenant Resolution
      |
      v
Load Tenant Firebase Configuration
      |
      v
Initialize Firebase
      |
      v
Firebase Authentication
      |
      v
Identify User
      |
      v
Resolve Tenant + Role
      |
      v
Load CRM
```

The current development implementation has successfully demonstrated:

```text
Abhinava Backend
       |
       v
Client 12
       |
       v
Sakteesawar Firebase
       |
       v
Dynamic Firebase Configuration
       |
       v
Google Authentication
       |
       v
Authenticated Tenant User
```

> The current test-client ID is a development mechanism and must not become a production tenant-selection mechanism.

---

# Authorization and Roles

Authentication answers:

> Who are you?

Authorization answers:

> What are you allowed to do?

These are separate concepts.

A user may authenticate successfully but still have limited permissions.

Potential client roles include:

- Owner
- Administrator
- Manager
- Sales
- Inventory
- Accounts
- Employee

The exact permissions will be defined module by module.

## Abhinava maintenance access

Abhinava platform personnel require infrastructure-maintenance access.

However:

> **Abhinava maintenance access must not automatically make an Abhinava employee a client CRM administrator.**

The system maintains a separation between:

```text
Abhinava Maintenance
```

and:

```text
Client Business Administration
```

An Abhinava operator should not be able to become a client administrator simply by changing a frontend role value.

Authorization must be enforced at the appropriate infrastructure, application and data layers.

---

# Data Ownership

The intended model is:

```text
Abhinava
    |
    +-- Client metadata
    +-- Tenant metadata
    +-- Provisioning metadata
    +-- Subscription metadata
    +-- Platform audit data


Client
    |
    +-- Business data
    +-- Customers
    +-- Products
    +-- Inventory
    +-- Gold records
    +-- Sales
    +-- Purchases
    +-- Vendors
    +-- Business reports
```

Abhinava should follow data-minimisation principles and only retain information required for operating the platform and fulfilling legitimate business, contractual, security or legal requirements.

---

# Client Onboarding

The client onboarding process is designed as follows:

```text
1. Client purchases/subscribes to Abhinava
              |
              v
2. Abhinava creates client record
              |
              v
3. Tenant ID generated
              |
              v
4. Google Cloud project created
              |
              v
5. Firebase enabled
              |
              v
6. Firebase Web App created
              |
              v
7. Required APIs enabled
              |
              v
8. Tenant access configured
              |
              v
9. Provisioning marked READY
              |
              v
10. Client can access CRM
```

The onboarding system keeps client/platform metadata in Abhinava while the client's operational business data is stored in the tenant environment.

---

# Current Provisioning Flow

The provisioning service is implemented in:

```text
backend/services/tenant_provisioning.py
```

The provisioning system currently handles:

- Google Cloud project creation
- Firebase enablement
- Firebase Web App creation
- Firebase Web App configuration retrieval
- Required API enablement
- Tenant project access configuration
- Provisioning status management
- Provisioning error recording

Provisioning is designed to be idempotent where possible so that retrying an interrupted operation does not unnecessarily create duplicate resources.

---

# Technology Stack

## Frontend

- React
- Vite
- Tailwind CSS
- React Router
- Firebase Web SDK
- Framer Motion
- Lucide React

## Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- Google Cloud APIs
- Firebase Management APIs
- Application Default Credentials

## Database

- PostgreSQL
- Alembic

## Tenant Infrastructure

- Google Cloud
- Firebase Authentication
- Cloud Firestore
- Firebase Web Apps
- Firebase Storage where required

## Development

- GitHub
- GitHub Codespaces
- Git
- npm
- Python virtual environments

---

# Repository Structure

```text
abhinava/
|
+-- backend/
|   |
|   +-- main.py
|   +-- models.py
|   +-- schemas.py
|   +-- database.py
|   |
|   +-- services/
|   |   +-- tenant_provisioning.py
|   |
|   +-- migrations/
|   |   +-- versions/
|   |
|   +-- .env
|   +-- .venv/
|
+-- frontend/
|   |
|   +-- src/
|       |
|       +-- App.jsx
|       +-- main.jsx
|       +-- firebase.js
|       |
|       +-- pages/
|       +-- layouts/
|       +-- context/
|       +-- assets/
|
+-- README.md
+-- .gitignore
```

Environment files and generated dependencies must not be committed.

---

# Backend

The FastAPI application provides the platform/control-plane API.

Important responsibilities include:

- Client management
- Client provisioning
- Tenant configuration retrieval
- Platform administration
- Future authentication/authorization APIs
- Platform-level audit operations

The backend must not become a generic proxy for arbitrary client business data unless explicitly designed and authorized.

---

# Frontend

The React application will contain three logical experiences:

```text
Public Website
     |
     +-- Marketing
     +-- Product information
     +-- Demo / contact
     +-- Login

Abhinava Portal
     |
     +-- Platform administration
     +-- Client provisioning
     +-- Maintenance
     +-- Platform audit

Tenant CRM
     |
     +-- Client business operations
     +-- Employee access
     +-- Tenant-specific data
```

The current Google login page is a development test surface. Production authentication will use proper portal routing, tenant resolution and authorization.

---

# Database and Migrations

PostgreSQL stores control-plane information.

SQLAlchemy models are defined in:

```text
backend/models.py
```

Database configuration is handled by:

```text
backend/database.py
```

Database schema migrations are managed with Alembic:

```text
backend/migrations/
```

Migration history must be maintained through Alembic.

Do not manually modify production database schemas without corresponding migrations.

---

# Firebase Architecture

Each tenant receives a dedicated Firebase project.

Example:

```text
Sakteesawar
    |
    +-- Firebase Project
            |
            +-- Firebase Authentication
            +-- Firestore
            +-- Firebase Web App
```

The frontend receives the Firebase Web App configuration dynamically from the Abhinava backend.

The configuration includes public Firebase application values such as:

- Project ID
- App ID
- API key
- Auth domain
- Storage bucket
- Messaging sender ID

Firebase configuration values are not treated as application secrets.

Actual secrets, service-account credentials and private credentials must never be exposed to the frontend or committed to Git.

---

# Security Model

Security is designed as multiple layers.

## Layer 1 — Identity

Firebase Authentication identifies users.

## Layer 2 — Tenant Resolution

The authenticated user is associated with a tenant.

## Layer 3 — Role

The user's role determines their functional responsibilities.

## Layer 4 — Permissions

Permissions determine which modules and operations the user can access.

## Layer 5 — Data Rules

Firebase Security Rules and backend authorization enforce access to tenant data.

## Layer 6 — Infrastructure IAM

Google Cloud IAM controls infrastructure-level access.

## Layer 7 — Auditability

Important administrative and security-sensitive operations should be auditable.

---

# Security Principles

The platform follows:

- Least privilege
- Tenant isolation
- Data minimisation
- Explicit authorization
- Secure credential management
- Auditability
- Defense in depth
- No reliance on frontend-only security
- Separation of platform and tenant administration
- Secure failure handling

---

# Auditability

Security-sensitive operations should produce appropriate audit records.

Examples include:

- Client creation
- Tenant provisioning
- Provisioning retries
- Access changes
- Role changes
- Administrative actions
- Maintenance operations
- Security configuration changes

Audit logs should capture sufficient information for investigation without unnecessarily storing sensitive business information.

---

# Privacy and DPDP Alignment

Abhinava is being designed with India's Digital Personal Data Protection framework in mind.

The platform architecture emphasizes:

- Data minimisation
- Purpose limitation
- Access control
- Tenant isolation
- Security safeguards
- Controlled retention
- Auditability
- Appropriate handling of personal data
- Clear responsibility boundaries

However:

> **Architecture alone does not constitute legal compliance.**

Final legal classification, contractual responsibilities, notices, consent mechanisms where applicable, retention schedules, breach procedures, data-subject rights workflows and other legal requirements must be reviewed against the final production processing model with qualified legal/privacy counsel.

The project should therefore be described as:

> **DPDP-aligned architecture / DPDP readiness**

until formal legal review and required operational controls are completed.

---

# CRM Modules

The CRM will be developed incrementally.

## Dashboard

Business overview and important operational metrics.

## Customers

Customer profiles, contact information, history and relevant interactions.

## Products

Jewelry product catalogue and product information.

## Inventory

Stock tracking and inventory operations.

## Gold Management

Gold-related records, weights, purity and movement tracking.

## Purchases

Purchase transactions and vendor-related operations.

## Sales

Sales transactions and customer-related operations.

## Vendors

Vendor management and purchase relationships.

## Employees

Employee accounts, roles and permissions.

## Reports

Operational and business reporting.

## Analytics

Business insights and future predictive capabilities.

## Audit

Administrative and security-related activity.

Every module must operate within the authenticated tenant context.

---

# Development Workflow

Development follows this general process:

```text
Requirement
    |
    v
Architecture decision
    |
    v
Database / API design
    |
    v
Backend implementation
    |
    v
Frontend implementation
    |
    v
Tenant/security validation
    |
    v
Testing
    |
    v
Git commit
    |
    v
Review
    |
    v
Deployment
```

Security and tenant isolation must be considered while building a feature, not added after the module is completed.

---

# Environment Configuration

Environment-specific configuration must be stored in environment variables.

Examples include:

```text
DATABASE_URL
GOOGLE_APPLICATION_CREDENTIALS
VITE_API_BASE_URL
VITE_TEST_CLIENT_ID
```

Do not commit:

```text
.env
.env.*
service-account JSON files
private keys
OAuth client secrets
database credentials
```

The current tenant/client ID used during development is temporary and must not become a production hard-coded value.

---

# Running the Project

## Backend

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Frontend

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

Build:

```bash
npm run build
```

---

# Production Readiness

Before releasing a tenant to production, the following areas must be verified.

## Infrastructure

- Dedicated tenant Firebase project
- Correct IAM configuration
- Required APIs enabled
- Provisioning status READY
- Tenant Web App configured
- Production domains configured

## Authentication

- Client authentication enabled
- Abhinava authentication separated
- Employee authentication supported
- Session handling verified
- Logout verified

## Authorization

- Tenant resolution verified
- Role-based access verified
- Permissions verified
- Cross-tenant access denied
- Abhinava maintenance access separated from client administration

## Data Security

- Firestore Security Rules tested
- Tenant isolation tested
- Unauthorized reads denied
- Unauthorized writes denied
- Sensitive information minimized

## Application

- Production API configured
- Production frontend configured
- Error handling verified
- Logging configured
- Audit logging configured

## Privacy

- Privacy notice reviewed
- Data processing responsibilities documented
- Retention policy defined
- Deletion/offboarding process defined
- Incident response process defined
- Legal review completed where required

---

# Project Status

## Phase 1 — Infrastructure Foundation

**Status: Completed**

Completed capabilities include:

- Abhinava control-plane database
- Client model
- Tenant ID generation
- Google Cloud project provisioning
- Firebase provisioning
- Firebase Web App provisioning
- Tenant Firebase configuration retrieval
- Required API provisioning
- Tenant project access configuration
- Provisioning status tracking
- Provisioning error tracking
- Dynamic tenant Firebase initialization
- Google authentication proof-of-concept
- Sakteesawar tenant authentication test
- Initial development CORS configuration

## Phase 2 — Platform and Authentication Experience

**Status: In progress**

Planned work:

- Public marketing website
- Portal selection
- Abhinava login
- Client login
- Tenant resolution
- Role resolution
- Protected routes
- Session management
- Logout
- Client employee access
- Tenant-aware authorization

## Phase 3 — First Jewelry CRM Module

The first production business module will be implemented after the authentication and authorization foundation is completed.

The first release is intended to validate the complete architecture with a real client tenant.

---

# Long-Term Vision

Abhinava is intended to evolve from a jewelry CRM into a complete intelligent business platform.

```text
                 ABHINAVA
                     |
        +------------+-------------+
        |            |             |
       CRM       Analytics       AI / ML
        |            |             |
        +------------+-------------+
                     |
              Jewelry Business
                     |
        +------------+-------------+
        |            |             |
    Operations    Finance      Customers
        |
   Inventory / Gold / Sales /
   Purchases / Products /
   Vendors / Employees
```

Future capabilities may include:

- Demand forecasting
- Inventory intelligence
- Sales forecasting
- Customer insights
- Business performance analytics
- Automated reporting
- Anomaly detection
- Operational recommendations

These capabilities must continue to respect tenant isolation and applicable privacy requirements.

---

# Core Architectural Promise

> **One platform. Isolated tenants. Client-owned business data. Controlled access.**

Abhinava operates the platform.

The client operates their business.

The architecture is designed so that these responsibilities remain clearly separated.

---

# Current Reference Tenant

The initial development/reference tenant is:

```text
Business: Sakteesawar
Tenant: Isolated Firebase environment
Purpose: Architecture and production-readiness validation
```

The tenant is used to validate the complete provisioning, authentication and isolation workflow before additional clients are onboarded.

---

# License

This repository contains proprietary software belonging to Abhinava.

Unauthorized copying, redistribution, commercial use or disclosure of the source code is not permitted without explicit authorization.

---

# Maintainers

**Abhinava**

Platform and software development team.
