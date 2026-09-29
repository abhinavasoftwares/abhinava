# Abhinava — Project Documentation

> Master technical documentation for Abhinava Softwares' Jewelry SaaS platform.

**Owner:** Abhinava Softwares  
**Repository:** Abhinava  
**Primary Product:** Abhinava Jewelry CRM  
**Status:** Production

---

# 1. Project Overview

Abhinava is a secure, tenant-isolated SaaS platform initially focused on jewelry businesses.

The platform provides business-management capabilities including:

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
- Future forecasting and ML capabilities

The long-term objective is to provide jewelry businesses with a modular operational platform rather than only a traditional CRM.

---

# 2. Core Architecture Principle

The most important architectural principle is:

> The client's business data belongs to the client and remains inside the client's isolated tenant environment.

Abhinava therefore separates:

1. **Abhinava Control Plane**
2. **Client Tenant Data Plane**

```text
                    ABHINAVA
                  CONTROL PLANE
                       |
                    PostgreSQL
                       |
        +--------------+--------------+
        |              |              |
      Client         Tenant       Subscription
     Metadata       Metadata        Metadata
        |
        +----------------------------------+
                                           |
                              TENANT DATA PLANE
                                           |
                    +----------------------+----------------------+
                    |                      |                      |
                 Client A               Client B               Client C
                 Firebase               Firebase               Firebase
                    |                      |                      |
               Business Data         Business Data         Business Data
