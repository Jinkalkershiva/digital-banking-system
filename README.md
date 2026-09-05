# 🏦 Digital Banking System

A production-inspired **Digital Banking System** built using **Spring Boot Microservices** following enterprise architecture and distributed system design principles.

The system demonstrates secure account management, money transfers, fraud detection, distributed transactions using the Saga Pattern, event-driven communication with Kafka, API Gateway routing, and containerized deployment using Docker.

---

# 🚀 Features

- ✅ Account Creation
- ✅ Account Management
- ✅ Balance Credit/Debit
- ✅ Money Transfer
- ✅ Transaction History
- ✅ Fraud Detection
- ✅ Notification Service
- ✅ API Gateway
- ✅ Distributed Transactions (Saga Pattern)
- ✅ Event-Driven Architecture using Kafka
- ✅ Dockerized Microservices
- 🔄 React Dashboard (In Progress)

---

# 🏗️ System Architecture

```
                    +------------------+
                    |   React Frontend |
                    +--------+---------+
                             |
                             ▼
                   +--------------------+
                   |    API Gateway     |
                   +---------+----------+
                             |
     --------------------------------------------------------
     |              |             |            |             |
     ▼              ▼             ▼            ▼             ▼

+-----------+ +-------------+ +-------------+ +-------------+ +----------------+
| Account   | | Payment     | | Transaction | | Notification| | Fraud Detection|
| Service   | | Service     | | Service     | | Service     | | Service        |
+-----------+ +-------------+ +-------------+ +-------------+ +----------------+
        \            |               |              |             /
         \-----------+---------------+--------------+------------/
                             |
                             ▼
                          Apache Kafka
```

---

# 🧩 Microservices

| Service | Responsibility |
|----------|----------------|
| API Gateway | Routes all client requests |
| Account Service | Account creation, balance management |
| Payment Service | Money transfer processing |
| Transaction Service | Saga orchestration and transaction management |
| Fraud Detection Service | Detect suspicious transactions |
| Notification Service | Email/SMS notifications |

---

# ⚙️ Tech Stack

### Backend

- Java 21
- Spring Boot 3
- Spring Cloud
- Spring Data JPA
- Spring Validation
- Spring Web

### Database

- MySQL

### Messaging

- Apache Kafka

### Distributed Transactions

- Saga Pattern

### Caching

- Redis

### API Gateway

- Spring Cloud Gateway

### Containerization

- Docker
- Docker Compose

### Frontend

- React.js
- Vite
- Tailwind CSS *(Planned)*

---

# 📂 Project Structure

```
digital-banking-system
│
├── backend
│   ├── account-service
│   ├── api-gateway-service
│   ├── fraud-detection-service
│   ├── notification-service
│   ├── payment-service
│   ├── transaction-service
│   └── docker-compose.yml
│
├── frontend
│
├── docs
│
├── postman
│
├── README.md
└── LICENSE
```

---

# 🔄 Saga Transaction Flow

```
Client
   │
   ▼
Payment Service
   │
   ▼
Account Service
   │
Debit Sender
   │
   ▼
Fraud Detection
   │
   ├── Fraud Found
   │      │
   │      ▼
   │ Refund Sender
   │
   └── Safe
          │
          ▼
Credit Receiver
          │
          ▼
Notification Service
```

---

# 📡 Event Flow

```
Payment Initiated
        │
        ▼
Kafka Topic
        │
        ▼
Transaction Service
        │
        ├── Fraud Detection
        ├── Account Service
        └── Notification Service
```

---

# 🐳 Running the Project

Clone the repository

```bash
git clone https://github.com/Jinkalkershiva/digital-banking-system.git
```

Go to backend

```bash
cd digital-banking-system/backend
```

Run Docker Compose

```bash
docker compose up
```

Run individual services

```bash
mvn spring-boot:run
```

---

# 📬 API Endpoints

## Account Service

| Method | Endpoint |
|----------|----------------|
| POST | /accounts |
| GET | /accounts/{id} |
| PUT | /accounts/{accountNumber}/credit |
| PUT | /accounts/{accountNumber}/deduct |

---

## Payment Service

| Method | Endpoint |
|----------|----------------|
| POST | /payments/transfer |

---

## Transaction Service

| Method | Endpoint |
|----------|----------------|
| GET | /transactions |

---

# 📷 Screenshots

> Screenshots will be added after frontend implementation.

---

# 📌 Future Enhancements

- JWT Authentication
- Spring Security
- Keycloak Integration
- OpenAPI / Swagger Documentation
- Prometheus Monitoring
- Grafana Dashboards
- ELK Logging
- Kubernetes Deployment
- CI/CD using GitHub Actions
- React Dashboard
- Email & SMS Notifications

---

# 📖 Learning Objectives

This project demonstrates:

- Microservices Architecture
- Distributed Systems
- Event-Driven Design
- Saga Pattern
- Kafka Messaging
- Docker & Containerization
- REST API Design
- API Gateway
- Enterprise Backend Development

---

# 👨‍💻 Author

**Shiva Jinkalker**

- GitHub: https://github.com/Jinkalkershiva
- LinkedIn: *(Add your LinkedIn profile here)*

---

## ⭐ If you found this project useful, consider giving it a Star!
