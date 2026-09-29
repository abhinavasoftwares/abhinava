# Abhinava Architecture

## 1. Overview

Abhinava is a multi-tenant SaaS platform initially built for jewelry businesses.

The platform provides business-management capabilities such as:

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

The core architectural principle is:

> The client's business data belongs to the client and remains within the client's isolated tenant environment.

Abhinava manages the platform, tenant configuration, provisioning, subscriptions, and platform-level metadata.

The client's operational business data is maintained within the client's dedicated Firebase environment.

---

## 2. Control Plane and Tenant Data Plane

Abhinava has two major layers:

Control Plane:
Managed by Abhinava and backed by PostgreSQL.

Tenant Data Plane:
Managed per client using the client's dedicated Firebase environment.

High-level architecture:

Abhinava Control Plane
    |
    +-- PostgreSQL
          |
          +-- Client Metadata
          +-- Tenant Metadata
          +-- Subscription Metadata
          +-- Provisioning Metadata
          |
          +-----------------------------+
                                        |
                              Tenant Data Plane
                                        |
                   +--------------------+--------------------+
                   |                    |                    |
                Client A             Client B             Client C
                Firebase             Firebase             Firebase
                   |                    |                    |
              Business A           Business B           Business C


## 3. Abhinava Control Plane

The Abhinava PostgreSQL database stores platform-level information required to operate the SaaS platform.

Examples include:

- Client ID
- Tenant ID
- Business name
- Client contact information
- Subscription information
- CRM domain
- Enabled modules
- Firebase project ID
- Firebase application information
- Provisioning status
- Provisioning information
- Platform audit information

The Control Plane must not unnecessarily store the client's operational business data.

Customer records, inventory records, sales records, gold records, and other client business information should remain within the respective client's tenant environment.


## 4. Client Tenant Data Plane

Each client receives an isolated Firebase environment.

The tenant environment contains the client's actual business data.

Examples include:

- Customers
- Products
- Inventory
- Gold records
- Purchases
- Sales
- Vendors
- Employees
- Business reports
- Other operational business information

Each client's tenant environment is independent from other clients.

Example:

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

Client A must never have access to Client B's business data.


## 5. Tenant Isolation

Tenant isolation is a fundamental security requirement of Abhinava.

Every client operation must occur within the correct tenant context.

The application must not rely only on frontend routing or UI restrictions to enforce tenant isolation.

Tenant access must be enforced using the appropriate combination of:

- Tenant resolution
- Authentication
- Backend authorization
- Firebase Security Rules
- Google Cloud IAM
- Application-level permissions

Logical security model:

User
 |
 +-- Tenant
      |
      +-- Role
           |
           +-- Permissions
                |
                +-- Business Data

A user belonging to Client A must never be able to access Client B's business data.

This applies even if the user:

- Changes the URL
- Modifies frontend requests
- Manipulates browser storage
- Calls APIs directly
- Attempts to access another tenant's Firebase resources

Security must therefore be enforced at the backend and data layers, not only in the frontend.


## 6. Authentication and Authorization

Authentication and authorization are separate concepts.

Authentication answers:

Who is the user?

Authorization answers:

What is the user allowed to do?

A user may successfully authenticate but still have limited permissions.

The application must determine:

Authenticated User
       |
       v
     Tenant
       |
       v
      Role
       |
       v
  Permissions
       |
       v
Allowed Operations

Potential client roles include:

- Owner
- Administrator
- Manager
- Sales
- Inventory
- Accounts
- Employee

The exact permissions are defined according to the modules and responsibilities of each role.


## 7. Abhinava Access vs Client Access

Abhinava platform administration and client business administration are separate responsibilities.

Abhinava Administration:

- Platform Management
- Client Management
- Tenant Provisioning
- Infrastructure
- Subscriptions
- Platform Configuration

Client Administration:

- Customers
- Inventory
- Products
- Sales
- Purchases
- Employees
- Reports
- Business Operations

Having infrastructure or maintenance access must not automatically grant client-level business administration privileges.

An Abhinava platform administrator and a client CRM administrator are different authorization boundaries.


## 8. Tenant Provisioning

When a new client is onboarded, Abhinava provisions the client's tenant environment.

High-level process:

Create Client
    |
    v
Create / Configure Tenant
    |
    v
Create Google Cloud / Firebase Environment
    |
    v
Enable Required Services
    |
    v
Create Firebase Application
    |
    v
Configure Tenant
    |
    v
Provisioning Complete
    |
    v
Client CRM Available

Provisioning is a platform operation performed by Abhinava.

The detailed client onboarding procedure, including Google Cloud, Firebase, IAM, billing, APIs, domains, and configuration, is documented separately in CLIENT_ONBOARDING.md.


## 9. Application Architecture

At a high level, Abhinava consists of:

                         USERS
                           |
              +------------+------------+
              |                         |
              v                         v
       Abhinava Portal             Client CRM
              |                         |
              v                         v
       Abhinava Backend          Tenant Firebase
              |                         |
              v                         v
       PostgreSQL Control        Client Business Data
            Plane                    Plane

Abhinava Portal is used for platform-level operations such as:

- Client management
- Tenant provisioning
- Subscription management
- Platform administration
- Infrastructure-related operations

Client CRM is used by the client's employees for day-to-day business operations.

Client CRM operations work within the authenticated client's tenant.


## 10. Data Ownership

Abhinava follows a clear separation of platform data and client business data.

Abhinava stores:

- Client metadata
- Tenant metadata
- Provisioning metadata
- Subscription metadata
- Platform configuration
- Platform audit information

The client environment stores:

- Customer data
- Product data
- Inventory data
- Gold data
- Sales data
- Purchase data
- Vendor data
- Employee data
- Business reports

The system should follow data-minimisation principles and avoid unnecessarily duplicating client business data inside the Abhinava Control Plane.


## 11. Core Architectural Rules

Rule 1 — Never compromise tenant isolation.

A feature must never create a path for one tenant to access another tenant's data.

Rule 2 — Keep client business data in the tenant.

Client operational business data should remain within the client's isolated tenant environment.

Rule 3 — PostgreSQL is the Abhinava Control Plane.

PostgreSQL is primarily responsible for platform and tenant metadata, not the client's operational business records.

Rule 4 — Never rely on frontend security alone.

Frontend routing, hidden buttons, UI restrictions, or local storage must never be treated as security boundaries.

Rule 5 — Authentication is not authorization.

Successfully logging in does not automatically grant access to every operation.

Tenant, role, and permissions must be checked.

Rule 6 — Separate Abhinava administration from client administration.

Platform maintenance access and client business access are separate authorization boundaries.

Rule 7 — Every CRM module must respect the tenant boundary.

New modules such as inventory, sales, purchases, gold management, or Kareegar management must operate within the authenticated tenant.

Rule 8 — Security must be designed into the feature.

Tenant isolation, authorization, and data protection must be considered during feature development rather than added after development is complete.

Rule 9 — Production configuration must not be hard-coded.

Tenant IDs, credentials, secrets, and environment-specific configuration must not be hard-coded into application code.

Rule 10 — Production changes must be traceable.

Significant architectural, database, security, or infrastructure changes should be committed to Git and documented when necessary.

## Summary

The fundamental Abhinava architecture is:

ABHINAVA CONTROL PLANE
        |
    PostgreSQL
        |
        +-- Client Metadata
        +-- Tenant Metadata
        +-- Subscription Metadata
        +-- Provisioning Metadata
        |
        +----------------------+
                               |
                         Tenant Boundary
                               |
             +-----------------+-----------------+
             |                 |                 |
          Client A          Client B          Client C
          Firebase          Firebase          Firebase
             |                 |                 |
         Business A        Business B        Business C

Abhinava manages the platform.

Each client operates within its own isolated business-data environment.
