# Abhinava Architecture

> Core architectural principles and system design of the Abhinava platform.

---

## 1. Overview

Abhinava is a multi-tenant SaaS platform designed initially for jewelry businesses.

The most important architectural principle is:

> **The client's business data belongs to the client and remains within the client's isolated tenant environment.**

Abhinava manages the platform, tenant configuration, provisioning, subscriptions and platform-level metadata.

Each client's operational business data is maintained in the client's dedicated Firebase environment.

---

# 2. Control Plane and Tenant Data Plane

Abhinava is divided into two major parts:

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
